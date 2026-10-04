import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { wordDiff } from '../../src/lib/diff';
import { Diff } from '../../src/components/ChangeCard';

const html = (old: string, nw: string) => renderToStaticMarkup(<MemoryRouter><Diff c={{ old, new: nw }} /></MemoryRouter>);

describe('word diff rendering', () => {
  it('renders an addition (empty old) as inserted text with live citations', () => {
    const h = html('', '**Could not be read** [12]');
    expect(h).toContain('addition');
    expect(h).toContain('<ins');
    expect(h).toContain('data-cite="12"');
    expect(h).not.toContain('<del');
  });
  it('renders a removal (empty new) as struck text, the old source codes as plain text', () => {
    const h = html('Sources: [S1] [S3] [S84].', '');
    expect(h).toContain('removal');
    expect(h).toContain('<del');
    expect(h).toContain('[S84]');
    expect(h).not.toContain('data-cite');
  });
  it('diffs word by word and keeps the old wording out of the live citations', () => {
    const parts = wordDiff('plus two the mental-health field has learned to add [S59]', 'plus two that this report adds [1]');
    expect(parts.some((p) => p.kind === 'del' && p.text.includes('[S59]'))).toBe(true);
    expect(parts.some((p) => p.kind === 'add' && p.text.includes('[1]'))).toBe(true);
    const h = html('learned to add [S59]', 'this report adds [1]');
    expect(h).toContain('data-cite="1"');
    expect(h).not.toContain('data-cite="S59"');
  });
});
