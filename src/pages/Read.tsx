/**
 * /read — the report, rendered as written (KICKOFF §4b). Every [n] is a button (the HoverLayer opens its card; a
 * click also folds the card out under the paragraph); terms open their definition; "Show what was checked" draws
 * the claim layer; change markers sit in the margin; each top-level section carries its counts strip and, where
 * the systems graph maps it, its "On the maps" links. Blocks keep their ids as anchors (#b-B0133).
 */
import { lazy, memo, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AS_OF_TEXT, blockDomId, counts, D, layersBrief, manifest, sectionsIndex, SLUG, topById, useData } from '@/lib/data';
import { renderNodes } from '@/components/Rich';
import { CiteCard, GROUP_LABEL } from '@/components/cards';
import ChangeCard from '@/components/ChangeCard';
import { changeLists, foldouts, showChecked, substantiveOnly } from '@/lib/reader-state';
import { useNotepad } from '@/lib/notepad-context';
import { useWide } from '@/components/Layout';
import type { ChangeItem, RBlock, RSection, OpenItemT } from '@/types';

const NotepadPanel = lazy(() => import('@/components/notepad/NotepadPanel'));
const FigureBody = lazy(() => import('@/components/figures/FigureBody'));

const BANNER_KEY = `bx-read-banner:${SLUG}`;

function useLoadAfterPaint() {
  // the claim layer, change markers and citation cards need these; fetch them right after the text paints
  useEffect(() => {
    const t = window.setTimeout(() => { void D.ledger.load(); void D.references.load(); void D.changes.load(); void D.openItems.load(); void D.glossaryShort.load(); }, 50);
    return () => window.clearTimeout(t);
  }, []);
}

// ------------------------------------------------------------------------------------------ one block
interface BlockProps { b: RBlock; checked: boolean; changes: ChangeItem[] | undefined; opens: OpenItemT[] | undefined; inAppendixD: boolean }

function FoldOut({ id }: { id: string }) {
  const n = foldouts.use(id);
  if (n === null) return null;
  return (
    <div className="bx-foldout not-prose" data-testid="foldout">
      <div className="flex justify-end -mt-1"><button type="button" className="bx-btn !py-0 !px-1.5 text-xs" onClick={() => foldouts.set(id, null)} aria-label={`Close source ${n}`}>×</button></div>
      <CiteCard n={n} block={id} />
    </div>
  );
}

function ChangeList({ id, changes }: { id: string; changes: ChangeItem[] }) {
  const open = changeLists.use(id);
  if (!open) return null;
  return (
    <div className="my-3 grid gap-2 text-[15px] leading-6 font-body" data-testid="change-list" role="region" aria-label={`Changes to passage ${id}`}>
      {changes.map((c) => <ChangeCard key={c.id} c={c} showWhere={false} />)}
    </div>
  );
}

function ChangeMarker({ id, n }: { id: string; n: number }) {
  const open = changeLists.use(id);
  return (
    <button type="button" className="bx-change-mark no-print" aria-label={`changed: ${n} ${n === 1 ? 'change' : 'changes'} to this passage`} aria-expanded={open}
      onClick={() => changeLists.set(id, !open)} data-testid="change-marker">
      <span aria-hidden="true">●{n}</span>
    </button>
  );
}

const Block = memo(function Block({ b, checked, changes, opens, inAppendixD }: BlockProps) {
  const domId = blockDomId(b.id);
  const n = changes?.length ?? 0;
  const inner = renderNodes(b.h, { checked, key: b.id });
  const marker = n > 0 ? <ChangeMarker id={b.id} n={n} /> : null;
  const oiLinks = inAppendixD && opens?.length ? (
    <span className="ml-2 text-[13px] font-semibold no-print">{opens.map((o, i) => <span key={o.id}>{i ? ' · ' : ''}<Link to={`/open-items#${o.id}`}>{o.id} →</Link></span>)}</span>
  ) : null;
  let el: ReactNode;
  if (b.kind === 'li') {
    const syn = b.marker === 'synthesis';
    return (
      <li id={domId} className={`bx-block ${syn ? 'bx-synthesis !my-2' : ''}`} data-block={b.id} data-foldable="" data-testid={syn ? 'analysis' : undefined}>
        {syn && <span id={b.syn} className="bx-synthesis-label">analysis</span>}
        {marker}{inner}{oiLinks}<FoldOut id={b.id} />{n > 0 && <ChangeList id={b.id} changes={changes!} />}
      </li>
    );
  }
  else if (b.kind === 'table') el = <div id={domId} className="bx-block" data-block={b.id} data-foldable="">{marker}<div className="bx-table-wrap" tabIndex={0} role="region" aria-label={`Table ${b.id}`}><table>{inner}</table></div><FoldOut id={b.id} />{n > 0 && <ChangeList id={b.id} changes={changes!} />}</div>;
  else el = <div className="bx-block" id={domId} data-block={b.id} data-foldable="">{marker}<p>{inner}{oiLinks}</p><FoldOut id={b.id} />{n > 0 && <ChangeList id={b.id} changes={changes!} />}</div>;
  if (b.marker === 'synthesis') return <div className="bx-synthesis" id={b.syn} data-testid="analysis"><span className="bx-synthesis-label">analysis</span>{el}</div>;
  return el;
});

// ------------------------------------------------------------------------------------------ section strips
function TopStrip({ id }: { id: string }) {
  const t = topById.get(id);
  if (!t || (!t.claims && !t.changes && !t.open)) return null;
  return (
    <p className="bx-section-strip no-print" data-testid="section-strip">
      <Link to={`/changes?section=${id}&weight=all`}>{t.claims.toLocaleString()} claims checked</Link>
      <span aria-hidden="true">·</span>
      <Link to={`/changes?section=${id}&weight=all`}>{t.changes} changed{t.substantive ? ` (${t.substantive} substantive)` : ''}</Link>
      <span aria-hidden="true">·</span>
      <Link to={`/open-items?section=${id}`}>{t.open} open {t.open === 1 ? 'item' : 'items'}</Link>
      {id === 'appendix-d' && <><span aria-hidden="true">·</span><Link to="/open-items">The same list on the Open items page, with where each was looked for →</Link></>}
    </p>
  );
}

function MapsStrip({ id }: { id: string }) {
  const t = topById.get(id);
  if (!t?.node || !t.layers.length) return null;
  const label = (lid: string) => layersBrief.find((l) => l.id === lid);
  return (
    <p className="text-[13px] -mt-2 mb-4 no-print" data-testid="maps-strip">
      <span className="font-semibold">On the maps: </span>
      {t.layers.map((lid, i) => {
        const l = label(lid);
        if (!l) return null;
        return (
          <span key={lid}>{i ? ' · ' : ''}{l.label}{' '}
            {l.geography.includes('county') && <Link to={`/map/alabama?layer=${lid}`}>Alabama</Link>}
            {l.geography.includes('county') && l.geography.includes('state') && ' / '}
            {l.geography.includes('state') && <Link to={`/map/us?layer=${lid}`}>US</Link>}
          </span>
        );
      })}
    </p>
  );
}

function ReaderFigure({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <figure ref={ref} className="my-6 bx-card p-3 font-body" data-testid="reader-figure" style={{ minHeight: seen ? undefined : 320 }}>
      {seen ? <Suspense fallback={<p className="bx-muted text-sm" role="status">Loading figure…</p>}><FigureBody id={id} compact /></Suspense> : <p className="bx-muted text-sm">Figure {id}</p>}
      <p className="mt-2 text-sm"><Link to={`/figures/${id}`}>Open the figure page →</Link></p>
    </figure>
  );
}

const Section = memo(function Section({ s, checked, changesBy, openBy }: { s: RSection; checked: boolean; changesBy: Map<string, ChangeItem[]> | undefined; openBy: Map<string, OpenItemT[]> | undefined }) {
  const H = (`h${Math.min(s.depth + 1, 4)}`) as 'h2' | 'h3' | 'h4';
  const size = s.depth === 1 ? 'text-3xl mt-14' : s.depth === 2 ? 'text-2xl mt-10' : 'text-xl mt-8';
  const isTop = topById.has(s.id);
  const inD = s.top === 'appendix-d';
  return (
    <section aria-labelledby={`h-${s.id}`} className="bx-sec" data-section={s.id}>
      <H id={s.id} className={`bx-section-h ${size} mb-3`}><span id={`h-${s.id}`}>{s.title}</span></H>
      {isTop && <TopStrip id={s.id} />}
      {isTop && <MapsStrip id={s.id} />}
      {s.chunks.map((c, i) => {
        if (c.k === 'fig') return <ReaderFigure key={`f-${c.id}`} id={c.id} />;
        if (c.k === 'b') return <Block key={c.b.id} b={c.b} checked={checked} changes={changesBy?.get(c.b.id)} opens={openBy?.get(c.b.id)} inAppendixD={inD} />;
        const ListTag = c.ordered ? 'ol' : 'ul';
        return (
          <ListTag key={`l-${i}`} className="bx-list" start={c.start ?? undefined}>
            {c.items.map((b) => <Block key={b.id} b={b} checked={checked} changes={changesBy?.get(b.id)} opens={openBy?.get(b.id)} inAppendixD={inD} />)}
          </ListTag>
        );
      })}
    </section>
  );
});

// ------------------------------------------------------------------------------------------ toolbar
function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] mt-2 bx-checked" aria-label="What the underlines mean" data-testid="claim-legend">
      {Object.entries(GROUP_LABEL).map(([g, label]) => (
        <li key={g} className="flex items-center gap-1.5"><span className={`bx-claim g-${g} bx-legend-swatch`} aria-hidden="true">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>{label}</li>
      ))}
    </ul>
  );
}

function Toolbar() {
  const checked = showChecked.use();
  const subst = substantiveOnly.use();
  return (
    <div className="bx-panel px-3 py-2 mb-6 text-sm no-print" data-testid="reader-toolbar">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
          <input type="checkbox" checked={checked} onChange={(e) => showChecked.set(e.target.checked)} data-testid="show-checked" />
          Show what was checked
        </label>
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={subst} onChange={(e) => substantiveOnly.set(e.target.checked)} data-testid="substantive-only" />
          Substantive changes only
        </label>
        <span className="bx-asof ml-auto">Current as of {AS_OF_TEXT}</span>
      </div>
      {checked && <Legend />}
    </div>
  );
}

function ReadBanner() {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(BANNER_KEY) === '1'; } catch { return false; } });
  if (hidden) return null;
  return (
    <div className="bx-banner no-print" role="note" data-testid="read-banner">
      <div className="flex gap-3 items-start">
        <p className="flex-1">Written by Little Orange Fish. Every claim was checked against its cited source on 3 October 2026; hover a bracketed number for the source and the passage that supports the sentence. Passages marked <em>analysis</em> are the report's own reading.</p>
        <button type="button" className="bx-btn !py-0.5" onClick={() => { setHidden(true); try { localStorage.setItem(BANNER_KEY, '1'); } catch { /* ignore */ } }} aria-label="Dismiss this note">×</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------ rail
const RAIL = sectionsIndex.filter((s) => s.depth <= 2);

function Rail({ current }: { current: string | null }) {
  const curTop = sectionsIndex.find((s) => s.id === current);
  const active = curTop ? (curTop.depth <= 2 ? curTop.id : [...RAIL].reverse().find((r) => sectionsIndex.indexOf(r) <= sectionsIndex.indexOf(curTop))?.id) : null;
  return (
    <nav aria-label="Sections" className="text-[13px] leading-5">
      <ol className="grid gap-0.5">
        {RAIL.map((s) => (
          <li key={s.id} className={s.depth === 1 ? 'mt-2 font-bold' : 'pl-2'}>
            <a href={`#${s.id}`} className={`block rounded px-1.5 py-0.5 no-underline hover:underline ${active === s.id ? 'font-bold' : ''}`} style={{ color: active === s.id ? 'var(--bx-accent)' : 'var(--bx-ink)' }} aria-current={active === s.id ? 'location' : undefined}>{s.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ------------------------------------------------------------------------------------------ selection → note
function SelectionNote() {
  const np = useNotepad();
  const [pos, setPos] = useState<{ x: number; y: number; quote: string; block: string | null; section: string | null } | null>(null);
  useEffect(() => {
    const onUp = () => {
      window.setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim() ?? '';
        if (!sel || !text || sel.rangeCount === 0) { setPos(null); return; }
        const node = sel.anchorNode instanceof Element ? sel.anchorNode : sel.anchorNode?.parentElement;
        const blockEl = node?.closest('[data-block]') as HTMLElement | null;
        const secEl = node?.closest('[data-section]') as HTMLElement | null;
        if (!secEl) { setPos(null); return; }
        const r = sel.getRangeAt(0).getBoundingClientRect();
        setPos({ x: r.left + r.width / 2, y: r.top + window.scrollY - 8, quote: text.slice(0, 1200), block: blockEl?.dataset.block ?? null, section: secEl.dataset.section ?? null });
      }, 10);
    };
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keyup', onUp);
    return () => { document.removeEventListener('mouseup', onUp); document.removeEventListener('keyup', onUp); };
  }, []);
  if (!pos) return null;
  return (
    <button type="button" className="bx-btn-primary absolute z-50 -translate-x-1/2 -translate-y-full shadow-lg no-print" style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { np.addNote(pos.block ? { type: 'block', id: pos.block } : { type: 'section', id: pos.section ?? '' }, pos.quote); np.setDock(true); if (!window.matchMedia('(min-width: 1280px)').matches) np.setOpen(true); setPos(null); window.getSelection()?.removeAllRanges(); }}
      data-testid="add-note-selection">✎ Add note</button>
  );
}

// ------------------------------------------------------------------------------------------ page
export default function Read() {
  const r1 = useData(D.reader1);
  const r2 = useData(D.reader2);
  const reader = useMemo(() => (r1 && r2 ? [...r1, ...r2] : undefined), [r1, r2]);
  const changes = useData(D.changes);
  const ois = useData(D.openItems);
  const checked = showChecked.use();
  const subst = substantiveOnly.use();
  const np = useNotepad();
  const wide = useWide();
  const loc = useLocation();
  const [current, setCurrent] = useState<string | null>(null);
  useLoadAfterPaint();

  const changesBy = useMemo(() => {
    if (!changes) return undefined;
    const m = new Map<string, ChangeItem[]>();
    for (const c of changes) { if (subst && c.weight !== 'substantive') continue; if (!m.has(c.block)) m.set(c.block, []); m.get(c.block)!.push(c); }
    return m;
  }, [changes, subst]);
  const openBy = useMemo(() => {
    if (!ois) return undefined;
    const m = new Map<string, OpenItemT[]>();
    for (const o of ois) for (const b of o.blocks) { if (!m.has(b)) m.set(b, []); m.get(b)!.push(o); }
    return m;
  }, [ois]);

  // deep links: #b-B0133 scrolls to the block and highlights it briefly; #section-id as usual
  useEffect(() => {
    if (!reader || !loc.hash) return;
    const id = decodeURIComponent(loc.hash.slice(1));
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;
      el.scrollIntoView({ block: id.startsWith('b-') ? 'center' : 'start' });
      if (id.startsWith('b-') || id.startsWith('analysis-')) { el.classList.remove('bx-flash'); void el.offsetWidth; el.classList.add('bx-flash'); }
    }, 30);
    return () => window.clearTimeout(t);
  }, [reader, loc.hash]);

  // the section in view, for the rail and the notepad's "This section"
  useEffect(() => {
    if (!reader) return;
    const hs = [...document.querySelectorAll<HTMLElement>('.bx-section-h')];
    const io = new IntersectionObserver((es) => {
      const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) { const id = vis[0].target.id; setCurrent(id); document.body.dataset.section = id; }
    }, { rootMargin: '-15% 0px -70% 0px' });
    hs.forEach((h) => io.observe(h));
    return () => { io.disconnect(); delete document.body.dataset.section; };
  }, [reader]);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6">
      <div className={`grid gap-8 ${wide ? (np.dock ? 'grid-cols-[220px_minmax(0,1fr)_360px]' : 'grid-cols-[220px_minmax(0,1fr)]') : 'grid-cols-1'}`}>
        {wide && (
          <aside className="sticky top-[calc(var(--hdr,8rem)+1rem)] h-[calc(100vh-var(--hdr,8rem)-2rem)] overflow-y-auto pr-2 no-print">
            <Rail current={current} />
          </aside>
        )}
        <article className="min-w-0">
          <header className="mb-4">
            <h1 className="text-3xl sm:text-4xl">Alabama Mental Health Systems Report</h1>
            <p className="bx-muted mt-1">Little Orange Fish · draft {manifest.report.version} · {counts.ledger.toLocaleString()} claims checked against their sources</p>
          </header>
          {!wide && (
            <label className="block mb-4 no-print">
              <span className="text-sm font-semibold">Jump to a section</span>
              <select className="bx-input mt-1" value="" onChange={(e) => { if (e.target.value) { location.hash = e.target.value; } }} data-testid="section-select">
                <option value="">Choose…</option>
                {RAIL.map((s) => <option key={s.id} value={s.id}>{s.depth === 2 ? '  ' : ''}{s.title}</option>)}
              </select>
            </label>
          )}
          <Toolbar />
          <ReadBanner />
          {!r1 ? <p className="bx-muted" role="status">Loading the report…</p> : (
            <div className={`bx-reader mx-auto pl-0 md:pl-10 ${checked ? 'bx-checked' : ''}`} data-testid="reader-body">
              {r1.map((s) => <Section key={s.id} s={s} checked={checked} changesBy={changesBy} openBy={openBy} />)}
              {r2 ? r2.map((s) => <Section key={s.id} s={s} checked={checked} changesBy={changesBy} openBy={openBy} />) : <p className="bx-muted" role="status">Loading the rest of the report…</p>}
            </div>
          )}
        </article>
        {wide && np.dock && (
          <aside className="sticky top-[calc(var(--hdr,8rem)+1rem)] h-[calc(100vh-var(--hdr,8rem)-2rem)] no-print" aria-label="Notepad">
            <Suspense fallback={<p className="bx-muted">Loading…</p>}><NotepadPanel section={current} onClose={() => np.setDock(false)} /></Suspense>
          </aside>
        )}
      </div>
      <SelectionNote />
    </div>
  );
}
