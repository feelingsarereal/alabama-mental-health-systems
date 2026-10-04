import { describe, expect, it } from 'vitest';
import MiniSearch from 'minisearch';
import fs from 'node:fs';
import path from 'node:path';
import { MINISEARCH_OPTIONS, SEARCH_OPTIONS, tokenize, type SearchDoc } from '../../src/lib/search-config';
import { ROOT } from './helpers';

const mini = MiniSearch.loadJS<SearchDoc>(JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/search.json'), 'utf8')), MINISEARCH_OPTIONS);
const search = (q: string) => mini.search(q, SEARCH_OPTIONS) as unknown as (SearchDoc & { id: string })[];

describe('search index', () => {
  it('keeps numbers as written', () => {
    expect(tokenize('15.1 per 100,000; Act 2026-383; $42 million')).toEqual(expect.arrayContaining(['15.1', '100,000', '100000', '2026-383', '2026', '383', '42']));
  });
  it('"771" finds the bed-count block', () => {
    const hits = search('771');
    expect(hits.some((h) => h.kind === 'block' && /771 beds|771 involuntary/.test(h.text))).toBe(true);
    expect(hits.some((h) => h.id === 'block:B0031')).toBe(true);
  });
  it('"Braggs" finds the case in the report, the glossary and the open items', () => {
    const kinds = new Set(search('Braggs').map((h) => h.kind));
    for (const k of ['block', 'term', 'open-item']) expect(kinds.has(k as SearchDoc['kind'])).toBe(true);
  });
  it('finds a county and an act number', () => {
    expect(search('Madison').some((h) => h.kind === 'county')).toBe(true);
    expect(search('2026-383').length).toBeGreaterThan(0);
  });
});
