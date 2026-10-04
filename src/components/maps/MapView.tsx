/**
 * The two choropleth maps (KICKOFF §4d). Geometry is pre-projected SVG paths from the content build. Numeric layers:
 * five-class quantile scale over the published values for the geography, breaks printed in the legend; one ramp
 * (brand orange for Alabama, brand slate for the US), never flipped by higher_is. Categorical layers: a categorical
 * palette with counts. Empty cells are hatched and labelled "not published or suppressed" — never zero. The only
 * computations shown are the class breaks and an area's position in the ordered list, each labelled.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AS_OF_TEXT } from '@/lib/data';
import { cellNumber, classOf, positionOf, positionText } from '@/lib/stats';
import { downloadText, toCsv } from '@/lib/download';
import { CiteCard } from '@/components/cards';
import { AddNoteButton } from '@/components/AddNoteButton';
import { CAT_COLORS, MISSING, RAMP_AL, RAMP_US, caveatFor, fmtBreak, fmtValue, higherLine, isRank, retrievalWords, unitNote, unitWords } from './format';
import type { AlMap, LayerT, MapArea, Overlay, UsMap } from '@/types';

type Geo = 'al' | 'us';
const GROUPS = ['People and place', 'Health and community', 'Workforce and shortage', 'Deaths', 'Coverage', 'Coverage policy', 'National rankings', 'Spending'];

interface Props { geo: Geo; layers: LayerT[]; map: AlMap | UsMap; alabamaState?: UsMap; defaultLayer: string }

function useNarrow() {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => { const mq = window.matchMedia('(max-width: 639px)'); const on = () => setN(mq.matches); mq.addEventListener('change', on); return () => mq.removeEventListener('change', on); }, []);
  return n;
}

export default function MapView({ geo, layers, map, defaultLayer }: Props) {
  const [sp, setSp] = useSearchParams();
  const narrow = useNarrow();
  const geoKey = geo === 'al' ? 'county' : 'state';
  const avail = useMemo(() => layers.filter((l) => l.geography.includes(geoKey) && l.picker), [layers, geoKey]);
  const layerId = sp.get('layer') && avail.some((l) => l.id === sp.get('layer')) ? sp.get('layer')! : defaultLayer;
  const layer = avail.find((l) => l.id === layerId)!;
  const sel = sp.get('geo');
  const overlays = new Set((sp.get('overlay') ?? '').split(',').filter(Boolean));
  const view = sp.get('view') ?? (narrow ? 'both' : 'map');
  const [q, setQ] = useState('');
  const [hover, setHover] = useState<string | null>(null);
  const [focusIdx, setFocusIdx] = useState<number>(-1);
  const [live, setLive] = useState('');
  const hideT = useRef<number>();
  const set = (p: Record<string, string | null>) => {
    const n = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(p)) { if (v === null || v === '') n.delete(k); else n.set(k, v); }
    setSp(n, { replace: true });
  };

  const stat = layer[geoKey]!;
  const raw = map.values[layer.id] ?? [];
  const nums = useMemo(() => raw.map(cellNumber), [raw]);
  const ramp = geo === 'al' ? RAMP_AL : RAMP_US;
  const catIndex = useMemo(() => new Map((stat.categories ?? []).map((c, i) => [c.value, i])), [stat]);
  const fillOf = (i: number) => {
    const v = raw[i];
    if (v === '' || v === undefined) return 'url(#hatch)';
    if (layer.type === 'categorical') return CAT_COLORS[(catIndex.get(v) ?? 0) % CAT_COLORS.length];
    const k = classOf(nums[i], stat.breaks);
    return k === null ? 'url(#hatch)' : ramp[k];
  };
  const order = useMemo(() => {
    const idx = map.areas.map((_, i) => i);
    if (layer.type === 'numeric') return idx.sort((a, b) => (nums[b] ?? -Infinity) - (nums[a] ?? -Infinity) || map.areas[a].name.localeCompare(map.areas[b].name));
    return idx.sort((a, b) => map.areas[a].name.localeCompare(map.areas[b].name));
  }, [map.areas, nums, layer.type]);
  const areaIdx = useMemo(() => new Map(map.areas.map((a, i) => [a.fips, i])), [map.areas]);
  const stateRow = geo === 'al' ? (map as AlMap).stateValues : null;
  const usRow = geo === 'us' ? (map as UsMap).usRow : null;
  const alIdx = geo === 'us' ? areaIdx.get('01') ?? -1 : -1;
  const areaLabel = (a: MapArea) => (geo === 'al' ? `${a.name} County` : a.name);
  const describe = (i: number) => {
    const a = map.areas[i];
    const v = raw[i];
    const pos = layer.type === 'numeric' ? positionText(positionOf(nums[i], nums)) : '';
    return `${areaLabel(a)}: ${fmtValue(v, layer)}${unitWords(layer) && v ? ` ${unitWords(layer)}` : ''}${pos ? `, ${pos}` : ''}`;
  };

  const shown = hover ?? (focusIdx >= 0 ? map.areas[order[focusIdx]]?.fips : null);
  const shownIdx = shown ? areaIdx.get(shown) ?? -1 : -1;

  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Enter', 'Home', 'End', 'Escape'].includes(e.key)) return;
    e.preventDefault();
    let k = focusIdx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = Math.min(order.length - 1, k + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = Math.max(0, k - 1);
    if (e.key === 'Home') k = 0;
    if (e.key === 'End') k = order.length - 1;
    if (e.key === 'Escape') { setFocusIdx(-1); return; }
    if (e.key === 'Enter') { if (k >= 0) set({ geo: map.areas[order[k]].fips }); return; }
    if (k < 0) k = 0;
    setFocusIdx(k);
    setLive(describe(order[k]));
  };

  // groups for the picker, filtered by the search box
  const pick = avail.filter((l) => !q || `${l.label} ${l.group} ${l.definition}`.toLowerCase().includes(q.toLowerCase()));

  const csv = () => {
    const rows: (string | number)[][] = [[geo === 'al' ? 'fips' : 'fips', geo === 'al' ? 'county' : 'state', layer.id, 'position (computed from the published values)']];
    for (const i of order) {
      const p = layer.type === 'numeric' ? positionOf(nums[i], nums) : null;
      rows.push([map.areas[i].fips, map.areas[i].name, raw[i], p ? positionText(p) : '']);
    }
    rows.push([]);
    rows.push(['source', `${layer.source_title}. ${layer.publisher}. ${layer.vintage}. ${layer.url} (retrieved ${layer.retrieved}). Reference [${layer.ref}]. Empty cells are missing values, not zero.`]);
    downloadText(toCsv(rows), `${geo === 'al' ? 'alabama-counties' : 'us-states'}-${layer.id}.csv`, 'text/csv;charset=utf-8');
  };

  const tooltip = shownIdx >= 0 ? (() => {
    const a = map.areas[shownIdx];
    const v = raw[shownIdx];
    const pos = layer.type === 'numeric' ? positionOf(nums[shownIdx], nums) : null;
    const cav = v === '' ? caveatFor(layer, a.name) : '';
    const left = `${(a.cx / map.width) * 100}%`;
    const top = `${(a.cy / map.height) * 100}%`;
    return (
      <div className="absolute z-20 bx-card p-2.5 text-sm w-64 shadow-lg" style={{ left, top, transform: `translate(${a.cx / map.width > 0.6 ? '-105%' : '12px'}, -50%)` }}
        role="status" data-testid="map-tooltip" onMouseEnter={() => window.clearTimeout(hideT.current)} onMouseLeave={() => setHover(null)}>
        <p className="font-bold">{areaLabel(a)}</p>
        <p className="mt-0.5"><span className="font-semibold" data-testid="tooltip-value">{fmtValue(v, layer)}</span>{v && unitWords(layer) ? <span className="bx-muted"> {unitWords(layer)}</span> : null}</p>
        {cav && <p className="text-xs mt-1" data-testid="tooltip-caveat">{cav}</p>}
        {!v && !cav && layer.suppressed_note && <p className="text-xs mt-1 bx-muted">{layer.suppressed_note}</p>}
        {pos && <p className="text-xs bx-muted mt-0.5">{positionText(pos)} (computed from the published values)</p>}
        {layer.id === 'medicaid_expansion_status' && usValue(map as UsMap, 'medicaid_expansion_date', shownIdx) && <p className="text-xs mt-0.5">Expansion date: {usValue(map as UsMap, 'medicaid_expansion_date', shownIdx)}</p>}
        {stateRow && stateRow[layer.id] !== undefined && <p className="text-xs mt-0.5">Alabama: {fmtValue(stateRow[layer.id], layer)}</p>}
        {usRow && usRow[layer.id] ? <p className="text-xs mt-0.5">United States: {fmtValue(usRow[layer.id], layer)}</p> : null}
        <p className="text-xs bx-muted mt-0.5">{layer.vintage} <button type="button" className="bx-cite" data-cite={layer.ref} aria-label={`Source ${layer.ref}`} data-testid="tooltip-cite">[{layer.ref}]</button></p>
      </div>
    );
  })() : null;

  const mapSvg = (
    <div className="relative" onMouseLeave={() => { hideT.current = window.setTimeout(() => setHover(null), 250); }}>
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className={`bx-map w-full h-auto ${geo === 'al' ? 'max-h-[80vh]' : ''}`} tabIndex={0}
        role="application" aria-roledescription="map" aria-label={`${geo === 'al' ? 'Alabama counties' : 'US states'} coloured by ${layer.label}. Use the arrow keys to move between ${geo === 'al' ? 'counties' : 'states'} in order of value and Enter to open one.`}
        onKeyDown={onKey} onBlur={() => setFocusIdx(-1)} data-testid="map-svg">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--bx-bg)" /><line x1="0" y1="0" x2="0" y2="6" stroke="var(--bx-muted)" strokeWidth="1.6" />
          </pattern>
          <pattern id="dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="var(--bx-ink)" /></pattern>
          <pattern id="stripes" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#2e7d5b" strokeWidth="2.5" /></pattern>
        </defs>
        <g>
          {map.areas.map((a, i) => (
            <path key={a.fips} d={a.d} className={`area ${sel === a.fips ? 'is-selected' : ''} ${shown === a.fips ? 'is-focus' : ''}`} fill={fillOf(i)} data-fips={a.fips} data-name={a.name} data-testid="map-area"
              onMouseEnter={() => { window.clearTimeout(hideT.current); setHover(a.fips); }} onClick={() => set({ geo: a.fips })}>
              <title>{describe(i)}</title>
            </path>
          ))}
        </g>
        {geo === 'us' && alIdx >= 0 && <path d={map.areas[alIdx].d} fill="none" stroke="#e8762b" strokeWidth={3} pointerEvents="none" data-testid="alabama-outline" />}
        {geo === 'al' && <OverlayLayers map={map as AlMap} on={overlays} />}
      </svg>
      {tooltip}
    </div>
  );

  const table = (
    <div className="overflow-x-auto mt-4" data-testid="map-table">
      <table className="w-full text-sm border-collapse">
        <caption className="text-left text-sm font-semibold mb-1">{layer.label}, by {geo === 'al' ? 'county' : 'state'} ({stat.published} published of {map.areas.length})</caption>
        <thead><tr className="bx-th text-left"><th className="p-1.5">{geo === 'al' ? 'County' : 'State'}</th><th className="p-1.5">Value</th>{layer.type === 'numeric' && <th className="p-1.5">Position (computed from the published values)</th>}</tr></thead>
        <tbody>
          {order.map((i) => {
            const a = map.areas[i];
            return (
              <tr key={a.fips} className="border-t" style={{ borderColor: 'var(--bx-line-soft)' }} data-testid="map-table-row">
                <td className="p-1.5"><button type="button" className="underline text-left" onClick={() => set({ geo: a.fips })}>{a.name}</button></td>
                <td className="p-1.5">{raw[i] === '' ? <span className="italic bx-muted">{MISSING}</span> : fmtValue(raw[i], layer)}</td>
                {layer.type === 'numeric' && <td className="p-1.5">{positionText(positionOf(nums[i], nums))}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)_22rem]">
      {/* picker */}
      <div className="no-print">
        <label className="block text-sm font-semibold" htmlFor="layer-search">Layer</label>
        <input id="layer-search" className="bx-input mt-1" type="search" placeholder="Search layers…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="layer-select">Choose a layer</label>
        <select id="layer-select" className="bx-input mt-2" size={narrow ? 1 : 14} value={layer.id} onChange={(e) => set({ layer: e.target.value })} data-testid="layer-select">
          {GROUPS.map((g) => {
            const xs = pick.filter((l) => l.group === g);
            if (!xs.length) return null;
            return <optgroup key={g} label={g}>{xs.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</optgroup>;
          })}
        </select>
        {geo === 'al' && <OverlayToggles map={map as AlMap} on={overlays} toggle={(id) => { const n = new Set(overlays); if (n.has(id)) n.delete(id); else n.add(id); set({ overlay: [...n].join(',') || null }); }} />}
      </div>

      {/* map + legend */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-sm mb-2">
          <h2 className="text-xl mr-auto" data-testid="layer-title">{layer.label}</h2>
          <span className="bx-asof">Current as of {AS_OF_TEXT}</span>
          <div role="group" aria-label="View" className="flex gap-1">
            <button type="button" className={`bx-btn !py-0.5 ${view !== 'table' ? 'bx-btn-on' : ''}`} aria-pressed={view !== 'table'} onClick={() => set({ view: null })}>Map</button>
            <button type="button" className={`bx-btn !py-0.5 ${view === 'table' ? 'bx-btn-on' : ''}`} aria-pressed={view === 'table'} onClick={() => set({ view: 'table' })} data-testid="map-table-button">Table</button>
          </div>
          <button type="button" className="bx-btn !py-0.5" onClick={csv} data-testid="map-csv">Download CSV</button>
        </div>
        <Legend layer={layer} geo={geo} ramp={ramp} />
        {view !== 'table' && mapSvg}
        <p className="sr-only" aria-live="polite" data-testid="map-live">{live}</p>
        {geo === 'al' && overlays.has('facilities') && <FacilityLegend map={map as AlMap} />}
        {(view === 'table' || view === 'both') && table}
        <AboutLayer layer={layer} />
      </div>

      {/* panel */}
      <aside aria-live="polite" className="min-w-0">
        {sel && areaIdx.has(sel)
          ? <AreaPanel geo={geo} fips={sel} layers={layers} map={map} onClose={() => set({ geo: null })} current={layer.id} />
          : <div className="bx-panel p-4 text-sm">Select a {geo === 'al' ? 'county' : 'state'} on the map or in the table to see every layer for it{geo === 'us' ? ', beside Alabama' : ''}.</div>}
      </aside>
    </div>
  );
}

function usValue(m: UsMap, id: string, i: number) {
  return m.values[id]?.[i] ?? '';
}

function Legend({ layer, geo, ramp }: { layer: LayerT; geo: Geo; ramp: string[] }) {
  const stat = layer[geo === 'al' ? 'county' : 'state']!;
  const hl = higherLine(layer);
  const note = unitNote(layer);
  return (
    <div className="text-xs mb-2" data-testid="map-legend">
      {layer.type === 'numeric' ? (
        <>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 items-center">
            {ramp.map((c, k) => {
              const b = stat.breaks;
              const label = !b.length ? '' : k === 0 ? `under ${fmtBreak(b[0])}` : k === ramp.length - 1 ? `${fmtBreak(b[b.length - 1])} and over` : `${fmtBreak(b[k - 1])} to under ${fmtBreak(b[k])}`;
              return <li key={k} className="flex items-center gap-1"><span aria-hidden="true" className="inline-block w-4 h-3 border" style={{ background: c, borderColor: 'var(--bx-line)' }} />{label}</li>;
            })}
            <li className="flex items-center gap-1"><svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill="url(#hatch-legend)" stroke="var(--bx-line)" /><defs><pattern id="hatch-legend" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--bx-muted)" strokeWidth="1.4" /></pattern></defs></svg>{MISSING} ({stat.missing.length})</li>
          </ul>
          <p className="mt-1 bx-muted">Five classes, each about a fifth of the {stat.published} published values; class breaks computed from the published values. {hl && <strong className="font-semibold" style={{ color: 'var(--bx-ink)' }}>{hl}.</strong>} {note && <strong className="font-semibold" style={{ color: 'var(--bx-ink)' }}>{note}.</strong>} {unitWords(layer) && <>Unit: {unitWords(layer)}.</>}</p>
        </>
      ) : (
        <ul className="flex flex-wrap gap-x-3 gap-y-1 items-center">
          {(stat.categories ?? []).map((c, i) => <li key={c.value} className="flex items-center gap-1"><span aria-hidden="true" className="inline-block w-4 h-3" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />{c.value.replace(/_/g, ' ')} ({c.count})</li>)}
          {stat.missing.length > 0 && <li className="flex items-center gap-1"><svg width="16" height="12" aria-hidden="true"><rect width="16" height="12" fill="url(#hatch-legend2)" stroke="var(--bx-line)" /><defs><pattern id="hatch-legend2" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="var(--bx-muted)" strokeWidth="1.4" /></pattern></defs></svg>{MISSING} ({stat.missing.length})</li>}
        </ul>
      )}
      {stat.missing.length > 0 && layer.suppressed_note && (
        <details className="mt-1"><summary className="cursor-pointer">Why some cells are empty</summary><p className="mt-1">{layer.suppressed_note}</p></details>
      )}
    </div>
  );
}

function AboutLayer({ layer }: { layer: LayerT }) {
  return (
    <section className="mt-8" aria-labelledby="about-layer">
      <h2 id="about-layer" className="text-xl">About this layer</h2>
      <dl className="mt-2 grid gap-1.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="font-semibold">Definition</dt><dd>{layer.definition}</dd>
        <dt className="font-semibold">Source</dt><dd>{layer.source_title}</dd>
        <dt className="font-semibold">Publisher</dt><dd>{layer.publisher}</dd>
        <dt className="font-semibold">Vintage</dt><dd>{layer.vintage}</dd>
        <dt className="font-semibold">How it was got</dt><dd>{retrievalWords(layer)}. <a href={layer.url} target="_blank" rel="noreferrer">Publisher's page ↗</a></dd>
        {layer.caveats && <><dt className="font-semibold">Caveats</dt><dd>{layer.caveats}</dd></>}
        {layer.suppressed_note && <><dt className="font-semibold">Empty cells</dt><dd>{layer.suppressed_note}</dd></>}
      </dl>
      <div className="bx-card p-3 mt-3" data-block=""><CiteCard n={layer.ref} /></div>
      <p className="text-sm mt-2"><Link to="/map/sources">All layers and their sources →</Link></p>
    </section>
  );
}

function AreaPanel({ geo, fips, layers, map, onClose, current }: { geo: Geo; fips: string; layers: LayerT[]; map: AlMap | UsMap; onClose: () => void; current: string }) {
  const geoKey = geo === 'al' ? 'county' : 'state';
  const i = map.areas.findIndex((a) => a.fips === fips);
  const a = map.areas[i];
  const alI = geo === 'us' ? map.areas.findIndex((x) => x.fips === '01') : -1;
  const ls = layers.filter((l) => l.geography.includes(geoKey) && l.picker);
  const info = geo === 'al' ? (map as AlMap).countyInfo[fips] : null;
  return (
    <div className="bx-card p-3 text-sm" data-testid="area-panel">
      <div className="flex items-start gap-2">
        <h2 className="text-xl flex-1">{geo === 'al' ? `${a.name} County` : a.name}</h2>
        <button type="button" className="bx-btn !py-0.5" onClick={onClose} aria-label="Close panel">×</button>
      </div>
      <p className="mt-1"><AddNoteButton anchor={{ type: 'map', id: `${geo}:${current}:${fips}` }} label="Add note on this area" /></p>
      {info && <OverlayInfo info={info} />}
      {GROUPS.map((g) => {
        const xs = ls.filter((l) => l.group === g);
        if (!xs.length) return null;
        return (
          <details key={g} open className="mt-3">
            <summary className="cursor-pointer font-semibold">{g}</summary>
            <table className="w-full mt-1 text-[13px] border-collapse">
              <thead><tr className="text-left bx-th"><th className="p-1">Layer</th><th className="p-1">{geo === 'al' ? 'County' : a.name}</th><th className="p-1">{geo === 'al' ? 'Alabama' : 'Alabama'}</th><th className="p-1">Position</th></tr></thead>
              <tbody>
                {xs.map((l) => {
                  const vals = map.values[l.id] ?? [];
                  const v = vals[i] ?? '';
                  const nums = vals.map(cellNumber);
                  const pos = l.type === 'numeric' ? positionOf(nums[i], nums) : null;
                  const cmp = geo === 'al' ? (map as AlMap).stateValues[l.id] : alI >= 0 ? vals[alI] : undefined;
                  return (
                    <tr key={l.id} className="border-t align-top" style={{ borderColor: 'var(--bx-line-soft)' }}>
                      <td className="p-1">{l.label} <button type="button" className="bx-cite" data-cite={l.ref} aria-label={`Source ${l.ref}`}>[{l.ref}]</button></td>
                      <td className="p-1 font-semibold">{v === '' ? <span className="italic font-normal bx-muted">{MISSING}</span> : fmtValue(v, l)}</td>
                      <td className="p-1">{cmp === undefined ? '—' : fmtValue(cmp, l)}</td>
                      <td className="p-1 bx-muted">{pos ? positionText(pos) : ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </details>
        );
      })}
      <p className="text-xs bx-muted mt-2">Positions are computed from the published values (highest first; ties share a position; empty cells are left out).{isRank(ls[0]) ? '' : ''}</p>
    </div>
  );
}

function OverlayInfo({ info }: { info: AlMap['countyInfo'][string] }) {
  return (
    <div className="mt-2 bx-panel p-2.5 grid gap-1 text-[13px]" data-testid="county-overlays">
      <p><strong>Community mental health center: </strong>{info.cmhc ? <>{info.cmhc.name}{info.cmhc.ccbhc ? ` · CCBHC${info.cmhc.ccbhc_date ? ` (${info.cmhc.ccbhc_date})` : ' (no date published)'}` : ''}<span className="block bx-muted">{info.cmhc.basis}</span></> : 'not listed'}</p>
      <p><strong>Crisis center: </strong>{info.crisis ? `${info.crisis.name} (opened ${info.crisis.opened}, read from ADMH's map image)` : "not listed for any center on ADMH's page"}</p>
      <p><strong>Mobile and rural crisis programmes: </strong>{info.mobile.length ? info.mobile.join('; ') : 'none named for this county'}</p>
      <p><strong>Service region: </strong>{info.region ? `Region ${info.region} (read from ADMH's map image)` : 'not shown'}</p>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ overlays
const DASHES = ['', '6 3', '2 3'];

function OverlayLayers({ map, on }: { map: AlMap; on: Set<string> }) {
  return (
    <g pointerEvents="none">
      {map.overlays.filter((o) => on.has(o.id) && o.id !== 'facilities').map((o) => (
        <g key={o.id} data-testid={`overlay-${o.id}`}>
          {o.id === 'mobile' && o.groups.map((g) => <path key={g.id} d={g.d} fill="url(#stripes)" fillOpacity={0.55} stroke="#2e7d5b" strokeWidth={1.2} />)}
          {o.id === 'crisis' && o.unassigned && <path d={o.unassigned.d} fill="url(#dots)" fillOpacity={0.6} stroke="var(--bx-ink)" strokeWidth={1.5} strokeDasharray="2 3" />}
          {o.id !== 'mobile' && o.groups.map((g, i) => (
            <path key={g.id} d={g.d} fill="none" stroke={o.id === 'regions' ? 'var(--bx-ink)' : CAT_COLORS[i % CAT_COLORS.length]} strokeWidth={o.id === 'regions' ? 3.5 : 2.4} strokeDasharray={o.id === 'cmhc' ? DASHES[Math.floor(i / CAT_COLORS.length) % DASHES.length] : o.id === 'regions' ? '10 4' : ''} data-testid="overlay-outline" />
          ))}
        </g>
      ))}
      {on.has('facilities') && map.overlays.find((o) => o.id === 'facilities')?.markers?.map((m, i) => <MarkerShape key={i} kind={m.kind} x={m.x} y={m.y} />)}
    </g>
  );
}

function MarkerShape({ kind, x, y, size = 6 }: { kind: string; x: number; y: number; size?: number }) {
  const s = size;
  const common = { stroke: '#ffffff', strokeWidth: 1.2 };
  switch (kind) {
    case 'crisis': return <path d={`M${x},${y - s} L${x + s},${y} L${x},${y + s} L${x - s},${y} Z`} fill="#a84f17" {...common} />;
    case 'pediatric': return <path d={`M${x},${y - s} L${x + s},${y + s * 0.8} L${x - s},${y + s * 0.8} Z`} fill="#7a4a8f" {...common} />;
    case 'call988': return <circle cx={x} cy={y} r={s * 0.8} fill="#3f6f8f" {...common} />;
    case 'hospital': return <rect x={x - s * 0.75} y={y - s * 0.75} width={s * 1.5} height={s * 1.5} fill="#222222" {...common} />;
    default: { // nova: a star
      const pts = Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? s * 0.45 : s; const a = -Math.PI / 2 + (k * Math.PI) / 5; return `${(x + r * Math.cos(a)).toFixed(1)},${(y + r * Math.sin(a)).toFixed(1)}`; });
      return <polygon points={pts.join(' ')} fill="#2e7d5b" {...common} />;
    }
  }
}

const MARKER_LABEL: Record<string, string> = { crisis: 'Crisis center', pediatric: 'Pediatric crisis unit', call988: '988 call center', hospital: 'State hospital', nova: 'NOVA first-episode psychosis site' };

function FacilityLegend({ map }: { map: AlMap }) {
  const o = map.overlays.find((x) => x.id === 'facilities')!;
  return (
    <div className="mt-3 text-[13px]" data-testid="facility-legend">
      <p className="font-semibold">Facilities</p>
      <p className="bx-muted">{o.note}</p>
      <ul className="mt-1 grid gap-1 sm:grid-cols-2">
        {o.markers!.map((m, i) => (
          <li key={i} className="flex gap-1.5 items-start">
            <svg width="16" height="16" aria-hidden="true" className="shrink-0 mt-0.5"><MarkerShape kind={m.kind} x={8} y={8} size={6} /></svg>
            <span><span className="font-semibold">{m.name}</span> <span className="bx-muted">· {MARKER_LABEL[m.kind]} · {m.city ? `${m.city}, ` : ''}{m.county} County{m.opened ? ` · opened ${m.opened} (read from ADMH's map image)` : ''}</span>{m.basis && m.kind === 'call988' ? <span className="block bx-muted">{m.basis}</span> : null} <a href={m.source_url} target="_blank" rel="noreferrer" className="text-xs">source ↗</a></span>
          </li>
        ))}
        {o.unplaced!.map((u, i) => <li key={`u${i}`} className="flex gap-1.5"><span aria-hidden="true" className="w-4 shrink-0 text-center">–</span><span><span className="font-semibold">{u.name}</span> <span className="bx-muted">· {u.kind} · no marker: {u.note}</span></span></li>)}
      </ul>
    </div>
  );
}

function OverlayToggles({ map, on, toggle }: { map: AlMap; on: Set<string>; toggle: (id: string) => void }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-semibold">ADMH overlays</legend>
      <ul className="mt-1 grid gap-2 text-[13px]">
        {map.overlays.map((o: Overlay) => (
          <li key={o.id}>
            <label className="flex gap-2 items-start cursor-pointer font-semibold">
              <input type="checkbox" className="mt-1" checked={on.has(o.id)} onChange={() => toggle(o.id)} data-testid={`toggle-${o.id}`} />
              <span>{o.label}</span>
            </label>
            {on.has(o.id) && (
              <div className="ml-6 mt-1 grid gap-1">
                <p className="bx-muted">ADMH, <a href={o.source_url} target="_blank" rel="noreferrer">source ↗</a> · {o.as_of}</p>
                {o.visual && <p className="font-semibold">{o.visual}</p>}
                {o.disagreement && <p className="bx-panel p-1.5" data-testid="overlay-disagreement">{o.disagreement}</p>}
                {o.verbatim && <details><summary className="cursor-pointer">The second page's words</summary><ul className="mt-1 grid gap-1">{o.verbatim.map((v, i) => <li key={i}>{v.replace(/^P:\s*/, '')}</li>)}</ul></details>}
                {o.id !== 'facilities' && (
                  <ul className="grid gap-0.5">
                    {o.groups.map((g, i) => (
                      <li key={g.id} className="flex gap-1.5 items-start">
                        <svg width="18" height="10" aria-hidden="true" className="shrink-0 mt-1">{o.id === 'mobile' ? <rect width="18" height="10" fill="url(#stripes)" stroke="#2e7d5b" /> : <line x1="0" y1="5" x2="18" y2="5" stroke={o.id === 'regions' ? 'var(--bx-ink)' : CAT_COLORS[i % CAT_COLORS.length]} strokeWidth="3" strokeDasharray={o.id === 'cmhc' ? DASHES[Math.floor(i / CAT_COLORS.length) % DASHES.length] : o.id === 'regions' ? '6 2' : ''} />}</svg>
                        <span>{g.label}{g.ccbhc ? ` · CCBHC${g.ccbhc_date ? ` (${g.ccbhc_date})` : ''}` : ''}{g.opened ? ` · opened ${g.opened}` : ''} <span className="bx-muted">({g.fips.length})</span></span>
                      </li>
                    ))}
                    {o.unassigned && <li className="flex gap-1.5"><svg width="18" height="10" aria-hidden="true" className="shrink-0 mt-1"><rect width="18" height="10" fill="url(#dots)" stroke="var(--bx-ink)" strokeDasharray="2 2" /></svg><span>{o.unassigned.label} ({o.unassigned.fips.length})</span></li>}
                    {o.alt && <li className="bx-muted">{o.alt.label}: {o.alt.fips.length} counties (not drawn).</li>}
                  </ul>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
