import { describe, expect, it } from 'vitest';
import { walk } from '../../src/lib/graph-walk';
import { readPack } from './helpers';

const g = JSON.parse(readPack('figures/data/systems-graph.json')) as { nodes: { id: string }[]; edges: { id: string; from: string; to: string; row: number }[] };

describe('systems graph walk on the real edges', () => {
  it('has the report\'s twelve parts and thirteen rows', () => {
    expect(g.nodes).toHaveLength(12);
    expect(new Set(g.edges.map((e) => e.row)).size).toBe(13);
    // KICKOFF §4e says 17 edges; the pack draws 16 (rows 3, 4 and 11 have two targets). The test follows the pack.
    expect(g.edges).toHaveLength(16);
  });
  it('walks upstream: what Services (d3) depends on', () => {
    const up = walk('d3', g.edges, 'upstream');
    expect([...up.nodes].sort()).toEqual(['d1', 'd2', 'd4', 'd5', 'd6', 'd7', 'd8', 's10', 's11', 's12', 's9'].sort());
  });
  it('walks downstream: what depends on Community (d8)', () => {
    const down = walk('d8', g.edges, 'downstream');
    for (const n of ['d1', 'd2', 'd3', 's9', 's10']) expect(down.nodes.has(n)).toBe(true);
    expect(down.nodes.has('d8')).toBe(false);
  });
  it('Housing (s11) is upstream of Services only', () => {
    const down = walk('s11', g.edges, 'downstream');
    expect([...down.nodes]).toEqual(['d3']);
    expect(walk('s11', g.edges, 'upstream').nodes.size).toBe(0);
  });
});
