import { useEffect, useMemo } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { D, blockHref, sectionTitle, tops, useData } from '@/lib/data';
import { Rich } from '@/components/Rich';
import { AddNoteButton } from '@/components/AddNoteButton';
import type { OpenItemT } from '@/types';

const GROUPS = ['Could not be read', 'Could not be confirmed', 'Not published, as far as this review found', 'Waiting on a date', 'Editorial decision (not printed in Appendix D)'];
const WHO: Record<string, string> = { author: 'the author', 'anyone-with-a-browser': 'anyone with a browser', 'next-review': 'the next review' };

function Item({ o }: { o: OpenItemT }) {
  return (
    <li id={o.id} className="bx-card p-4 scroll-mt-40" data-testid="open-item">
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-mono font-bold">{o.id}</span>
        <span className="bx-chip-line">who can close it: {WHO[o.who]}</span>
        <AddNoteButton anchor={{ type: 'open-item', id: o.id }} className="ml-auto" />
      </div>
      <p className="mt-2 text-[16px] font-semibold leading-7"><Rich nodes={o.what} /></p>
      <p className="mt-2 text-[15px] leading-7"><strong>Why it is open: </strong><Rich nodes={o.why} /></p>
      {o.looked.length > 0 && (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer font-semibold">Where it was looked for ({o.looked.length})</summary>
          <ul className="mt-1 list-disc pl-5 grid gap-1">{o.looked.map((l, i) => <li key={i} className="break-words">{l}</li>)}</ul>
        </details>
      )}
      <p className="mt-2 text-[15px] leading-7"><strong>How to close it: </strong><Rich nodes={o.how_to_close} /></p>
      <p className="mt-2 text-sm flex flex-wrap gap-x-3 gap-y-1">
        {o.block_refs.map((b) => (b.exists
          ? <Link key={b.id} to={blockHref(b.id)}>{b.top === 'appendix-d' ? 'Printed in Appendix D' : sectionTitle(b.section)} · {b.id} →</Link>
          : <span key={b.id} className="bx-todo">block {b.id} is not in the text</span>))}
        {!o.block_refs.length && o.sections.map((s) => <Link key={s} to={`/read#${s}`}>{sectionTitle(s)} →</Link>)}
      </p>
    </li>
  );
}

export default function OpenItems() {
  const all = useData(D.openItems);
  const loc = useLocation();
  const [sp, setSp] = useSearchParams();
  const who = sp.get('who') ?? '';
  const section = sp.get('section') ?? '';
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };
  const shown = useMemo(() => (all ?? []).filter((o) => (!who || o.who === who) && (!section || o.tops.includes(section) || o.block_refs.some((b) => b.top === section))), [all, who, section]);
  const pinned = shown.filter((o) => o.pinned);
  useEffect(() => {
    if (!all || !loc.hash) return;
    const el = document.getElementById(loc.hash.slice(1));
    if (el) { el.scrollIntoView(); el.classList.add('bx-flash'); }
  }, [all, loc.hash]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">What the check could not settle</h1>
      <p className="bx-prose mt-2">{all?.length ?? 95} open items: sources that could not be read, claims that could not be confirmed, things not published as far as the review found, and dates still to come. The report prints the same list as <Link to="/read#appendix-d">Appendix D</Link>; each item here says where it was looked for and how to close it.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm" role="group" aria-label="Filter open items">
        <label><span className="block text-xs mb-0.5">Who can close it</span>
          <select className="bx-input" value={who} onChange={(e) => setF('who', e.target.value)} data-testid="filter-who">
            <option value="">Anyone</option>{Object.entries(WHO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label><span className="block text-xs mb-0.5">Part of the report</span>
          <select className="bx-input" value={section} onChange={(e) => setF('section', e.target.value)} data-testid="filter-oi-section">
            <option value="">All parts</option>{tops.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select></label>
      </div>
      <p className="text-sm mt-2" role="status" data-testid="oi-shown">{shown.length} shown</p>
      {!all ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <>
          {pinned.length > 0 && (
            <section className="mt-6" aria-labelledby="pinned-h">
              <h2 id="pinned-h" className="text-2xl">Two things a person with a browser can settle in ten minutes</h2>
              <ul className="mt-3 grid gap-3">{pinned.map((o) => <Item key={o.id} o={o} />)}</ul>
            </section>
          )}
          {GROUPS.map((g, gi) => {
            const xs = shown.filter((o) => o.group === g && !o.pinned);
            if (!xs.length) return null;
            return (
              <section key={g} className="mt-8" aria-labelledby={`g-${gi}`}>
                <h2 id={`g-${gi}`} className="text-2xl">{g} <span className="text-base bx-muted font-normal">({xs.length + shown.filter((o) => o.group === g && o.pinned).length})</span></h2>
                <ul className="mt-3 grid gap-3">{xs.map((o) => <Item key={o.id} o={o} />)}</ul>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
