/**
 * The only computations the maps may show (KICKOFF §4d), each labelled "computed from the published values":
 * five-class quantile breaks over the published values for one geography, and an area's position in the ordered
 * list. No averages, no per-capita conversions, no combining layers. Empty cells are missing values, never zero.
 */
import { scaleQuantile } from 'd3-scale';

/** A published cell as a number, or null when it is empty (missing — never zero) or not a number. */
export function cellNumber(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '') return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The four inner thresholds of a five-class quantile scale over the published values (d3 scaleQuantile, R-7). */
export function quantileBreaks(values: (number | null)[]): number[] {
  const v = values.filter((x): x is number => x !== null);
  if (v.length < 5) return [];
  return scaleQuantile<number>().domain(v).range([0, 1, 2, 3, 4]).quantiles();
}

/** Class 0–4 of a value against the breaks, or null for a missing value. */
export function classOf(value: number | null, breaks: number[]): number | null {
  if (value === null) return null;
  let k = 0;
  while (k < breaks.length && value >= breaks[k]) k++;
  return k;
}

export interface Position { position: number; of: number; tied: number }

/**
 * Position of `value` counting from the highest published value ("12th highest of 67"). Ties share the position
 * (1, 2, 2, 4); missing values are left out of the count. Null for a missing value.
 */
export function positionOf(value: number | null, values: (number | null)[]): Position | null {
  if (value === null) return null;
  const v = values.filter((x): x is number => x !== null);
  const higher = v.filter((x) => x > value).length;
  const tied = v.filter((x) => x === value).length;
  return { position: higher + 1, of: v.length, tied };
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function positionText(p: Position | null): string {
  if (!p) return '';
  return `${p.tied > 1 ? 'tied ' : ''}${ordinal(p.position)} highest of ${p.of}`;
}
