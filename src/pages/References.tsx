import { memo, useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { D, fmtDate, sectionTitle, useData } from '@/lib/data';
import { READ_LABEL } from '@/components/cards';
import { AddNoteButton } from '@/components/AddNoteButton';
import type { Reference } from '@/types';

const TIERS: { id: Reference['tier']; title: string; blurb: string }[] = [
  { id: 'seminal', title: 'Seminal', blurb: 'The frameworks, statutes and founding documents the report builds on, oldest first so the history reads forward.' },
  { id: 'classic', title: 'Classic', blurb: 'Established works the field still relies on.' },
  { id: 'current', title: 'Current', blurb: 'Sources from 2021 on that carry the report’s figures and events, newest first.' },
  { id: 'background', title: 'Background', blurb: 'Context: national frameworks, explainers and data documentation.' },
];
const URL_STATUS: Record<string, string> = { moved: 'the address has moved; the link goes to where it was read', blocked: 'the publisher’s site blocked the reader; read through another copy', dead: 'the link no longer works' };

const RefCard = memo(function RefCard({ r }: { r: Reference }) {
  return (
    <li id={`ref-${r.n}`} className="bx-card p-4 scroll-mt-40" data-testid="ref-card">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono font-bold">[{r.n}]</span>
        <a href={r.url} target="_blank" rel="noreferrer" className="font-bold text-[16px]">{r.title} <span aria-hidden="true">↗</span></a>
      </div>
      <p className="text-sm mt-0.5">{r.publisher} · {r.published} · <span className="bx-muted">{r.doc_type}</span></p>
      <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
        <span className="bx-tier">{r.tier}</span>
        <span className="bx-chip-line">{READ_LABEL[r.read]}</span>
        <span className="bx-chip-line">read {fmtDate(r.accessed)}</span>
        {r.anchor && <span className="bx-chip-line">anchor</span>}
        {r.ledger_only && <span className="bx-chip-line">cited only in the claims ledger</span>}
        {!r.verified && <span className="bx-todo">not verified — summary from abstract/metadata only</span>}
      </p>
      {r.summary ? <p className="mt-2 text-[15px] leading-7">{r.summary}</p> : <p className="mt-2 bx-todo">summary pending</p>}
      {r.tier === 'seminal' && r.why_it_mattered && <p className="mt-2 text-[15px]"><strong>Why it mattered: </strong>{r.why_it_mattered}</p>}
      {r.role_note && <p className="mt-2 text-sm"><strong>Its role here: </strong>{r.role_note}</p>}
      {r.newer_edition && (
        <p className="mt-2 text-sm bx-panel p-2"><strong>A newer edition exists: </strong>{r.newer_edition.url ? <a href={r.newer_edition.url} target="_blank" rel="noreferrer">{r.newer_edition.title}</a> : r.newer_edition.title}{r.newer_edition.published ? ` (${r.newer_edition.published})` : ''}.{r.newer_edition.note ? ` ${r.newer_edition.note}` : ''}</p>
      )}
      {r.url_status && r.url_status !== 'ok' && <p className="mt-1 text-xs bx-muted">Link: {URL_STATUS[r.url_status] ?? r.url_status}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        {r.cited_in.length > 0 && <span>Cited in: {r.cited_in.map((s, i) => <span key={s}>{i ? ' · ' : ''}<Link to={`/read#${s}`}>{sectionTitle(s)}</Link></span>)}</span>}
        <AddNoteButton anchor={{ type: 'ref', id: String(r.n) }} className="ml-auto" />
      </div>
    </li>
  );
});

export default function References() {
  const refs = useData(D.references);
  const loc = useLocation();
  const [sp, setSp] = useSearchParams();
  const f = { tier: sp.get('tier') ?? '', type: sp.get('type') ?? '', read: sp.get('read') ?? '', newer: sp.get('newer') === '1' };
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const types = useMemo(() => [...new Set((refs ?? []).map((r) => r.doc_type))].sort(), [refs]);
  const shown = useMemo(() => (refs ?? []).filter((r) => (!f.tier || r.tier === f.tier) && (!f.type || r.doc_type === f.type) && (!f.read || r.read === f.read) && (!f.newer || !!r.newer_edition)), [refs, f.tier, f.type, f.read, f.newer]);
  useEffect(() => {
    if (!refs || !loc.hash) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (el) { el.scrollIntoView(); el.classList.add('bx-flash'); }
  }, [refs, loc.hash]);
  const main = shown.filter((r) => !r.aux);
  const aux = shown.filter((r) => r.aux);
  const sortTier = (t: Reference['tier'], xs: Reference[]) => [...xs].sort((a, b) => (t === 'seminal' ? a.year - b.year : b.year - a.year) || a.n - b.n);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">References</h1>
      <p className="bx-prose mt-2">All {refs?.length ?? 329} sources, each opened and read for the check of 3 October 2026; {refs ? refs.filter((r) => r.read === 'partial').length : 74} could be read only in part. Each card says how fully it was read, what the report uses it for and where it is cited.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-4 text-sm" role="group" aria-label="Filter references">
        <label><span className="block text-xs mb-0.5">Tier</span><select className="bx-input" value={f.tier} onChange={(e) => setF('tier', e.target.value)}><option value="">All</option>{TIERS.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
        <label><span className="block text-xs mb-0.5">Document type</span><select className="bx-input" value={f.type} onChange={(e) => setF('type', e.target.value)}><option value="">All</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        <label><span className="block text-xs mb-0.5">How fully read</span><select className="bx-input" value={f.read} onChange={(e) => setF('read', e.target.value)}><option value="">All</option><option value="full">read in full</option><option value="partial">read in part</option></select></label>
        <label className="flex items-end gap-2 pb-1.5"><input type="checkbox" checked={f.newer} onChange={(e) => setF('newer', e.target.checked ? '1' : '')} /> Has a newer edition</label>
      </div>
      <p className="text-sm bx-muted mt-2" role="status">{shown.length} shown</p>
      {!refs ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <>
          {TIERS.map((t) => {
            const xs = sortTier(t.id, main.filter((r) => r.tier === t.id));
            if (!xs.length) return null;
            return (
              <section key={t.id} className="mt-8" aria-labelledby={`tier-${t.id}`}>
                <h2 id={`tier-${t.id}`} className="text-2xl">{t.title} <span className="text-base bx-muted font-normal">({xs.length})</span></h2>
                <p className="text-sm bx-muted">{t.blurb}</p>
                <ul className="mt-3 grid gap-3">{xs.map((r) => <RefCard key={r.n} r={r} />)}</ul>
              </section>
            );
          })}
          {aux.length > 0 && (
            <section className="mt-10" aria-labelledby="tier-aux">
              <h2 id="tier-aux" className="text-2xl">Sources for the maps, glossary and primers <span className="text-base bx-muted font-normal">({aux.length})</span></h2>
              <p className="text-sm bx-muted">Cited only by the map layers, the glossary or the primers — not by the report's text.</p>
              <ul className="mt-3 grid gap-3">{[...aux].sort((a, b) => a.n - b.n).map((r) => <RefCard key={r.n} r={r} />)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
