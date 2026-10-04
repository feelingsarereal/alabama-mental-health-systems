/**
 * The content build fails loudly: a copy of the real pack with one deliberate error per rule must exit non-zero
 * and name each error. Runs scripts/build-content.ts against a temporary pack (BX_PACK) with temporary outputs.
 */
import { describe, expect, it, beforeAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, PACK } from './helpers';

let out = '';
let code = 0;

beforeAll(() => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bx-pack-'));
  const pack = path.join(tmp, 'content-pack');
  fs.cpSync(PACK, pack, { recursive: true });
  fs.rmSync(path.join(pack, 'BUILD-ERRORS.md'), { force: true });
  const edit = (f: string, fn: (s: string) => string) => fs.writeFileSync(path.join(pack, f), fn(fs.readFileSync(path.join(pack, f), 'utf8')));
  // 1. a ledger entry whose quote is not in its block
  edit('claims-ledger.yaml', (s) => s.replace('quote: Version 2 supersedes the June 2025 edition (v250603)', 'quote: Version 9 supersedes nothing at all'));
  // 2. a ledger source number with no reference
  edit('claims-ledger.yaml', (s) => s.replace(/(sources:\n  - n: )\d+/, '$19999'));
  // 3. a change pointing at an unknown block
  edit('changes.yaml', (s) => s.replace('- id: CH-001\n  block: B0012', '- id: CH-001\n  block: B0999'));
  // 4. a map column with no layer, 5. a layer with no column
  edit('geo/al_counties.csv', (s) => s.split('\n').map((l, i) => (l ? `${l},${i === 0 ? 'mystery_column' : '1'}` : l)).join('\n'));
  edit('geo/layers.json', (s) => { const j = JSON.parse(s); j.push({ ...j[0], id: 'ghost_layer', label: 'Ghost' }); return JSON.stringify(j); });
  // 6. uncited prose in review.md
  edit('review.md', (s) => s.replace('<!-- section: guide-why-this-report-exists -->', '<!-- section: guide-why-this-report-exists -->').replace(/(Alabama's mental health system is not one system\. It is a set of systems[^\n]*?) <!-- framing --> <!-- b: B0012 -->/, '$1 <!-- b: B0012 -->'));
  try {
    out = execFileSync('npx', ['tsx', 'scripts/build-content.ts'], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, BX_PACK: pack, BX_OUT: path.join(tmp, 'out'), BX_PUBLIC: path.join(tmp, 'public') },
    });
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string };
    code = err.status; out = `${err.stdout}\n${err.stderr}`;
  }
}, 120_000);

describe('content build fails loudly', () => {
  it('exits non-zero', () => expect(code).not.toBe(0));
  it('names a ledger quote that is not in its block', () => expect(out).toMatch(/claims-ledger\.yaml B0004\.b: anchor fails in B0004 — quote matches 0 times/));
  it('names a ledger source number with no reference', () => expect(out).toMatch(/claims-ledger\.yaml B0004\.[a-z]+: reference \[9999\] is not in references\.yaml|reference \[9999\] is not in references\.yaml/));
  it('names a change pointing at an unknown block', () => expect(out).toMatch(/changes\.yaml CH-001: block B0999 is not in review\.md/));
  it('names a map column with no layer', () => expect(out).toMatch(/geo\/al_counties\.csv: column mystery_column has no county layer in layers\.json/));
  it('names a layer with no column', () => expect(out).toMatch(/geo\/layers\.json ghost_layer: no column in geo\/al_counties\.csv/));
  it('names uncited prose', () => expect(out).toMatch(/review\.md B0012: uncited block of \d+ words/));
});
