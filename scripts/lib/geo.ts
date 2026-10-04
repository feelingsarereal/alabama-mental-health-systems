/**
 * Map build (KICKOFF §4d). Geometry comes from the `us-atlas` npm package at build time and is projected here into
 * SVG path strings, so the app fetches nothing and ships no projection code: Alabama's 67 counties
 * (counties-10m.json, FIPS 01…) under a Mercator fitted to the state; the 50 states and DC (states-10m.json) under
 * geoAlbersUsa. Service-area outlines are topojson merges of the counties a list in overlays.json names.
 *
 * Facility markers: overlays.json gives a city and county for each facility, not coordinates, so each marker sits
 * at its county's centroid (spread slightly when several share a county). The 988 call centers are given with a
 * city only; their county is taken from the crisis-center record in the same file for the same city, a rule stated
 * in the legend and on /map/sources.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { geoAlbersUsa, geoMercator, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, FeatureCollection, Geometry } from 'geojson';

const require = createRequire(import.meta.url);
const atlasDir = path.dirname(require.resolve('us-atlas/package.json'));

export interface Area { fips: string; name: string; d: string; cx: number; cy: number }
export interface Shape { id: string; d: string }

function loadTopo(file: string): Topology {
  return JSON.parse(fs.readFileSync(path.join(atlasDir, file), 'utf8')) as Topology;
}

export function alabamaGeometry(names: Map<string, string>, errors: string[]) {
  const topo = loadTopo('counties-10m.json');
  const coll = topo.objects.counties as GeometryCollection;
  const geoms = coll.geometries.filter((g) => String(g.id).startsWith('01'));
  const fc = feature(topo, { type: 'GeometryCollection', geometries: geoms }) as FeatureCollection<Geometry, { name: string }>;
  const W = 520; const H = 780;
  const proj = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc);
  const p = geoPath(proj).digits(1);
  const have = new Set(geoms.map((g) => String(g.id)));
  for (const f of names.keys()) if (!have.has(f)) errors.push(`geo/al_counties.csv: FIPS ${f} has no geometry in us-atlas counties-10m.json`);
  for (const f of have) if (!names.has(f)) errors.push(`us-atlas: Alabama county ${f} has no row in geo/al_counties.csv`);
  const areas: Area[] = (fc.features as Feature<Geometry, { name: string }>[]).filter((f) => names.has(String(f.id))).map((f) => {
    const [cx, cy] = p.centroid(f);
    return { fips: String(f.id), name: names.get(String(f.id))!, d: p(f) ?? '', cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 };
  }).sort((a, b) => a.fips.localeCompare(b.fips));
  const outline = p(merge(topo, geoms as never)) ?? '';
  const mergeOf = (fips: string[]) => {
    const set = new Set(fips);
    return p(merge(topo, geoms.filter((g) => set.has(String(g.id))) as never)) ?? '';
  };
  return { width: W, height: H, areas, outline, mergeOf };
}

export function usGeometry(rows: Map<string, { abbr: string; name: string }>, errors: string[]) {
  const topo = loadTopo('states-10m.json');
  const coll = topo.objects.states as GeometryCollection;
  const geoms = coll.geometries.filter((g) => rows.has(String(g.id)));
  const have = new Set(geoms.map((g) => String(g.id)));
  for (const f of rows.keys()) if (!have.has(f)) errors.push(`geo/us_states.csv: FIPS ${f} has no geometry in us-atlas states-10m.json`);
  const fc = feature(topo, { type: 'GeometryCollection', geometries: geoms }) as FeatureCollection;
  const W = 960; const H = 600;
  const proj = geoAlbersUsa().fitExtent([[10, 10], [W - 10, H - 10]], fc);
  const p = geoPath(proj).digits(1);
  const areas: Area[] = fc.features.map((f) => {
    const [cx, cy] = p.centroid(f);
    const r = rows.get(String(f.id))!;
    return { fips: String(f.id), name: r.name, abbr: r.abbr, d: p(f) ?? '', cx: Math.round(cx * 10) / 10, cy: Math.round(cy * 10) / 10 };
  }).sort((a, b) => a.fips.localeCompare(b.fips));
  return { width: W, height: H, areas };
}
