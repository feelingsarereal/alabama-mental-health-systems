import { describe, expect, it } from 'vitest';
import { parseReview } from '../../scripts/lib/review';
import { block, realReview } from './helpers';

describe('review parser: sections, blocks, markers', () => {
  it('reads a trailing block comment and strips it from the rendered text', () => {
    const [b] = block('Alabama has 771 beds [30]. <!-- b: B0031 -->');
    expect(b.id).toBe('B0031');
    expect(b.kind).toBe('p');
    expect(b.text).toBe('Alabama has 771 beds [30].');
    expect(b.cites).toEqual([30]);
  });
  it('reads a marker that sits just before the block id', () => {
    const [b] = block('This is the report reading the evidence [12] <!-- synthesis --> <!-- b: B0084 -->');
    expect(b.marker).toBe('synthesis');
    expect(b.id).toBe('B0084');
    expect(b.text).not.toContain('<!--');
  });
  it('reads +n block ids added during revision', () => {
    const [b] = block('- An item added in revision [3] <!-- b: B0619+12 -->');
    expect(b.id).toBe('B0619+12');
    expect(b.kind).toBe('li');
  });
  it('takes a table block id from the comment on the line above the table, with an optional marker', () => {
    const bs = block('<!-- b: B0098 --> <!-- framing -->\n\n|**A**|**B**|\n|---|---|\n|x [20]|y [18]|');
    expect(bs).toHaveLength(1);
    expect(bs[0]).toMatchObject({ id: 'B0098', kind: 'table', marker: 'framing' });
    expect(bs[0].cites).toEqual([20, 18]);
  });
  it('fails loudly on a block without an id and on a heading without a section marker', () => {
    const r = parseReview('<!-- section: s -->\n# S\n\nNo id here.\n\n## Orphan heading\n');
    expect(r.errors.join('\n')).toMatch(/block has no <!-- b: … --> id/);
    expect(r.errors.join('\n')).toMatch(/heading with no <!-- section: id -->/);
  });
  it('parses the real report: 155 sections, every block with an id, no uncited prose', () => {
    const r = realReview();
    expect(r.errors).toEqual([]);
    expect(r.sections).toHaveLength(155);
    expect(r.blocks.length).toBeGreaterThan(400);
    const uncited = r.blocks.filter((b) => b.kind !== 'table' && b.words >= 25 && !b.cites.length && b.marker !== 'framing');
    expect(uncited).toEqual([]);
  });
});
