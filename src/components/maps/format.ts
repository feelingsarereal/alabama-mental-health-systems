/** Value formatting for the maps: published values as written, with their unit; empty cells never as zero. */
import type { LayerT } from '@/types';

export const MISSING = 'not published or suppressed';

export function isRank(l: LayerT): boolean {
  return /_rank$/.test(l.id) || l.unit.startsWith('rank');
}

export function unitNote(l: LayerT): string {
  if (isRank(l)) {
    const m = /\(([^)]*)\)/.exec(l.unit);
    return m ? m[1] : '1 is best';
  }
  return '';
}

export function fmtNumber(raw: string): string {
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) return raw;
  const dec = (raw.split('.')[1] ?? '').length;
  return n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function fmtValue(raw: string | undefined, l: LayerT): string {
  if (raw === undefined || raw === '') return MISSING;
  if (l.type === 'categorical') return raw.replace(/_/g, ' ');
  if (l.type === 'date') return raw;
  const s = fmtNumber(raw);
  if (l.unit.startsWith('percent')) return `${s}%`;
  if (l.unit.startsWith('dollars')) return `$${s}`;
  if (isRank(l)) return `${s} of ${l.unit.includes('52') ? 52 : 51}`;
  return s;
}

/** The unit, in words, for a numeric layer whose formatted value does not already carry it. */
export function unitWords(l: LayerT): string {
  if (l.type !== 'numeric') return '';
  if (l.unit === 'percent' || isRank(l)) return '';
  return l.unit;
}

export function fmtBreak(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/** The sentence(s) of a layer's caveats that name this area — e.g. why Coosa and Lamar have no ratio. */
export function caveatFor(l: LayerT, name: string): string {
  const sentences = l.caveats.split(/(?<=\.)\s+(?=[A-Z])/);
  return sentences.filter((s) => s.includes(name)).join(' ');
}

export function higherLine(l: LayerT): string {
  if (l.type !== 'numeric' || isRank(l)) return '';
  return l.higher_is === 'worse' ? 'Higher is worse' : l.higher_is === 'better' ? 'Higher is better' : '';
}

export function retrievalWords(l: LayerT): string {
  const d = new Date(`${l.retrieved}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  if (l.retrieval === 'browser-js') return `retrieved from the publisher's own data file on ${d}`;
  return `retrieved (${l.retrieval}) on ${d}`;
}

export const RAMP_AL = ['#fde9db', '#f8c39b', '#f09a5e', '#d4692a', '#8f4212'];
export const RAMP_US = ['#e8edf1', '#c3d0d9', '#93a8b8', '#5f7b91', '#33506a'];
export const CAT_COLORS = ['#a84f17', '#3f6f8f', '#2e7d5b', '#b38600', '#7a4a8f', '#7a8791', '#c2185b'];
