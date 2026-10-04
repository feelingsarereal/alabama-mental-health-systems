import { Link } from 'react-router-dom';
import { wordDiff, citeRuns, type DiffPart } from '@/lib/diff';
import { Rich } from '@/components/Rich';
import { blockHref, sectionTitle } from '@/lib/data';
import type { ChangeItem } from '@/types';

export const TYPE_LABEL: Record<string, string> = {
  correction: 'correction', update: 'update', reattribution: 'moved to the right source', 'new-source': 'new source', softened: 'softened', removed: 'removed', wording: 'wording',
};
export const PASS_LABEL: Record<string, string> = {
  'section-editor': 'section edit', consistency: 'consistency pass', 'editor-in-chief': 'editor-in-chief', 'read-through': 'read-through', 'spot-check': 'spot-check', 'announcement-check': 'announcement check',
};

function Live({ text }: { text: string }) {
  return <>{citeRuns(text).map((r, i) => (typeof r === 'number' ? <button key={i} type="button" className="bx-cite" data-cite={r} aria-label={`Source ${r}`} aria-haspopup="dialog">[{r}]</button> : <span key={i}>{r}</span>))}</>;
}

export function Diff({ c }: { c: Pick<ChangeItem, 'old' | 'new'> }) {
  const parts: DiffPart[] = wordDiff(c.old, c.new);
  const kind = !c.old.trim() ? 'addition' : !c.new.trim() ? 'removal' : null;
  return (
    <p className="leading-7 text-[15px]" data-testid="diff">
      {kind && <span className="bx-chip-line mr-1.5">{kind}</span>}
      {parts.map((p, i) =>
        p.kind === 'del' ? <del key={i} className="line-through decoration-2" style={{ color: 'var(--bx-muted)', textDecorationColor: 'var(--g-unsourced)' }}>{p.text}</del>
          : p.kind === 'add' ? <ins key={i} className="no-underline rounded-sm" style={{ background: 'var(--bx-fill)', textDecoration: 'none' }}><Live text={p.text} /></ins>
            : <span key={i}><Live text={p.text} /></span>)}
    </p>
  );
}

export default function ChangeCard({ c, showWhere = true, blockExists = true }: { c: ChangeItem; showWhere?: boolean; blockExists?: boolean }) {
  return (
    <article className="bx-card p-3 text-sm" id={c.id} data-block={c.block} data-testid="change-card">
      <header className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="font-mono font-bold">{c.id}</span>
        <span className={c.weight === 'substantive' ? 'bx-chip font-bold' : 'bx-chip-line'} style={c.weight === 'substantive' ? { background: 'var(--bx-fill)' } : undefined}>{c.weight}</span>
        <span className="bx-chip-line">{TYPE_LABEL[c.type] ?? c.type}</span>
        <span className="bx-muted">{PASS_LABEL[c.pass] ?? c.pass}</span>
        {c.needs_author && <span className="bx-todo">needs the author</span>}
        {c.amends_revision && <span className="bx-chip-line" title="old is the interim wording from earlier the same day, not the PDF's">amends the revision</span>}
        <span className="bx-muted ml-auto">decision: {c.decision}</span>
      </header>
      <div className="mt-2"><Diff c={c} /></div>
      <p className="mt-2"><span className="font-semibold">Why: </span><Rich nodes={c.reason} /></p>
      <footer className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {c.sources.length > 0 && <span className="flex flex-wrap gap-1 items-center"><span className="bx-muted">Sources:</span>{c.sources.map((n) => <button key={n} type="button" className="bx-chip-line !text-[12px]" data-cite={n} aria-label={`Source ${n}`} aria-haspopup="dialog">[{n}]</button>)}</span>}
        {showWhere && (blockExists
          ? <Link to={blockHref(c.block)} className="font-semibold">{sectionTitle(c.section)} · {c.block} →</Link>
          : <Link to={`/read#${c.section}`} className="font-semibold">{sectionTitle(c.section)} → <span className="bx-todo ml-1">block {c.block} is not in the text</span></Link>)}
        {c.claims.length > 0 && <span className="bx-muted">Ledger claims touched: <span className="font-mono">{c.claims.join(', ')}</span></span>}
      </footer>
    </article>
  );
}
