/**
 * Word-level diff for the change log (KICKOFF §4c). `old` is the draft's wording and still carries the PDF's source
 * codes ([S84]); it is shown as text only. `new` carries numbered citations, which render as live buttons. Emphasis
 * markers (`**`, `_`) are dropped for display on both sides before diffing, so a word that only gained italics is
 * not reported as changed. An entry with empty `old` is an addition; with empty `new`, a removal.
 */
import { diffWords } from 'diff';

export interface DiffPart { kind: 'same' | 'add' | 'del'; text: string }

export function plainForDiff(s: string): string {
  return s.replace(/\*\*/g, '').replace(/(^|[\s(“"])_([^_]+?)_(?=[\s.,;:)”"']|$)/g, '$1$2');
}

// a bracketed citation ([12], [S84]) is one token for the diff, so a changed number never splits it
const protect = (s: string) => s.replace(/\[([A-Za-z]?\d+[a-z]?)\]/g, 'QCITEQ$1QQ');
const restore = (s: string) => s.replace(/QCITEQ([A-Za-z]?\d+[a-z]?)QQ/g, '[$1]');

export function wordDiff(oldText: string, newText: string): DiffPart[] {
  const a = plainForDiff(oldText);
  const b = plainForDiff(newText);
  if (!a.trim()) return b ? [{ kind: 'add', text: b }] : [];
  if (!b.trim()) return [{ kind: 'del', text: a }];
  return diffWords(protect(a), protect(b)).map((p) => ({ kind: p.added ? 'add' : p.removed ? 'del' : 'same', text: restore(p.value) }));
}

/** Split text into plain runs and live citation numbers: only for text that comes from `new`. */
export function citeRuns(text: string): (string | number)[] {
  const out: (string | number)[] = [];
  let last = 0;
  for (const m of text.matchAll(/\[(\d+)\]/g)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push(Number(m[1]));
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
