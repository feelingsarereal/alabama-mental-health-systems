import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { D, tops, useData, manifest } from '@/lib/data';
import ChangeCard, { PASS_LABEL, TYPE_LABEL } from '@/components/ChangeCard';
import { AddNoteButton } from '@/components/AddNoteButton';
import { downloadText, toCsv } from '@/lib/download';
import type { ChangeItem } from '@/types';

const PAGE = 120;
const blockNum = (b: string) => { const m = /^B(\d{4})(?:\+(\d+))?$/.exec(b); return m ? Number(m[1]) * 1000 + Number(m[2] ?? 0) : 0; };

export default function Changes() {
  const all = useData(D.changes);
  const [sp, setSp] = useSearchParams();
  const [limit, setLimit] = useState(PAGE);
  const f = {
    section: sp.get('section') ?? '', type: sp.get('type') ?? '', weight: sp.get('weight') ?? 'substantive', pass: sp.get('pass') ?? '',
    author: sp.get('author') === '1', block: sp.get('block') ?? '', id: sp.get('id') ?? '',
  };
  const setF = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); n.delete('id'); setSp(n, { replace: true }); setLimit(PAGE); };
  const ordered = useMemo(() => (all ? [...all].sort((a, b) => a.order - b.order || blockNum(a.block) - blockNum(b.block) || a.id.localeCompare(b.id)) : []), [all]);
  const shown = useMemo(() => {
    if (f.id) return ordered.filter((c) => c.id === f.id);
    return ordered.filter((c) => (!f.section || c.top === f.section) && (!f.type || c.type === f.type) && (f.weight === 'all' || c.weight === f.weight)
      && (!f.pass || c.pass === f.pass) && (!f.author || c.needs_author) && (!f.block || c.block === f.block));
  }, [ordered, f.id, f.section, f.type, f.weight, f.pass, f.author, f.block]);
  const csv = (xs: ChangeItem[]) => toCsv([
    ['id', 'block', 'section', 'type', 'weight', 'pass', 'old', 'new', 'reason', 'sources', 'claims', 'amends_revision', 'needs_author', 'decision'],
    ...xs.map((c) => [c.id, c.block, c.section, c.type, c.weight, c.pass, c.old, c.new, c.reason_text, c.sources.join(';'), c.claims.join(';'), String(c.amends_revision), String(c.needs_author), c.decision]),
  ]);
  const types = Object.keys(TYPE_LABEL);
  const passes = Object.keys(PASS_LABEL);
  const n = all?.length ?? 0;
  const subst = all?.filter((c) => c.weight === 'substantive').length ?? 0;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">What the check changed</h1>
      <p className="mt-2 text-[15px]" data-testid="changes-counts"><strong>{n.toLocaleString()}</strong> changes logged · <strong>{subst}</strong> substantive · {n - subst} minor{all ? ` · ${all.filter((c) => c.needs_author).length} marked for the author` : ''}</p>
      <p className="bx-panel p-3 mt-3 text-[15px]">Every change below is <strong>pending the author's decision</strong>: nothing here has been accepted by {manifest.authors[0]}. The notepad can hold a note on any entry. Each card shows the draft's wording struck through and the revised wording highlighted; the draft's own source codes (such as [S84]) are shown as text, the new numbered citations open their source.</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-sm items-end" role="group" aria-label="Filter changes">
        <label className="sm:col-span-2"><span className="block text-xs mb-0.5">Part of the report</span>
          <select className="bx-input" value={f.section} onChange={(e) => setF('section', e.target.value)} data-testid="filter-section">
            <option value="">All parts</option>
            {tops.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select></label>
        <label><span className="block text-xs mb-0.5">Type</span><select className="bx-input" value={f.type} onChange={(e) => setF('type', e.target.value)} data-testid="filter-type"><option value="">All</option>{types.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}</select></label>
        <label><span className="block text-xs mb-0.5">Weight</span><select className="bx-input" value={f.weight} onChange={(e) => setF('weight', e.target.value === 'substantive' ? '' : e.target.value)} data-testid="filter-weight"><option value="substantive">Substantive</option><option value="minor">Minor</option><option value="all">All</option></select></label>
        <label><span className="block text-xs mb-0.5">Pass</span><select className="bx-input" value={f.pass} onChange={(e) => setF('pass', e.target.value)}><option value="">All</option>{passes.map((p) => <option key={p} value={p}>{PASS_LABEL[p]}</option>)}</select></label>
        <label className="flex items-center gap-2 pb-1.5"><input type="checkbox" checked={f.author} onChange={(e) => setF('author', e.target.checked ? '1' : '')} /> Needs the author</label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span role="status" data-testid="changes-shown">{shown.length} shown</span>
        {(f.block || f.id) && <span className="bx-chip-line">{f.id ? `change ${f.id}` : `passage ${f.block}`} <button type="button" className="ml-1 underline" onClick={() => { const nn = new URLSearchParams(sp); nn.delete('block'); nn.delete('id'); setSp(nn, { replace: true }); }}>clear</button></span>}
        <button type="button" className="bx-btn ml-auto" onClick={() => downloadText(csv(shown), `alabama-mh-changes-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8')} data-testid="download-csv">Download CSV</button>
      </div>
      {!all ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <ol className="mt-4 grid gap-3">
          {shown.slice(0, limit).map((c) => (
            <li key={c.id} className="grid gap-1">
              <ChangeCard c={c} blockExists={c.block_exists} />
              <div className="flex justify-end"><AddNoteButton anchor={{ type: 'change', id: c.id }} /></div>
            </li>
          ))}
        </ol>
      )}
      {shown.length > limit && <p className="mt-4"><button type="button" className="bx-btn" onClick={() => setLimit((l) => l + PAGE)}>Show {Math.min(PAGE, shown.length - limit)} more</button></p>}
      <p className="mt-8 text-sm"><Link to="/open-items">What the check could not settle: the open items →</Link></p>
    </div>
  );
}
