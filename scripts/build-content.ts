/**
 * Content build (KICKOFF §3): validate the content pack, parse review.md into blocks, link citations and terms,
 * anchor the claim ledger, index changes and open items, build the maps and the systems graph, build the search
 * index, and emit src/data/*.json + public/provenance.json. Fails loudly: every error is listed, written to
 * content-pack/BUILD-ERRORS.md and the process exits non-zero, but whatever validated is still emitted so the app
 * can show the errors on /methods. Idempotent: the same pack gives byte-identical output.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import Papa from 'papaparse';
import MiniSearch from 'minisearch';
import type { Element, Root as HRoot } from "hast";
import { toHast } from 'mdast-util-to-hast';
import {
  ManifestSchema, BrandSchema, GlossarySchema, ConceptFrontmatterSchema, FiguresSchema, ReferencesSchema, TodoSchema, ScopeSchema,
  LedgerSchema, ChangesSchema, OpenItemsSchema, VerificationStatsSchema, LayersSchema, SystemsGraphSchema, IndicatorsSchema, zodLines,
  type Layer,
} from './lib/schemas';
import { parseReview, parseMarkdown, inlineHast, claimWords, type Block } from './lib/review';
import { buildMatcher, findAmbiguousVariants, type Matcher } from './lib/terms';
import { compactChildren, linkCitations, type CNode } from './lib/hast-ops';
import { linkTerms } from './lib/link-terms';
import { findAnchor, wrapClaim, statusGroup } from './lib/claims';
import { alabamaGeometry, usGeometry } from './lib/geo';
import { cellNumber, quantileBreaks } from '../src/lib/stats';
import { MINISEARCH_OPTIONS, type SearchDoc } from '../src/lib/search-config';
import type {
  RBlock, RChunk, RSection, SectionMeta, TopMeta, Reference as RefT, LedgerItem, ChangeItem, OpenItemT, GlossaryItem, ConceptT, FigureT,
  LayerT, GeoStat, AlMap, UsMap, Overlay, CountyOverlayInfo, Marker2, SystemsData,
} from '../src/types';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACK = process.env.BX_PACK ? path.resolve(process.env.BX_PACK) : path.join(ROOT, 'content-pack');
const OUT = process.env.BX_OUT ? path.resolve(process.env.BX_OUT) : path.join(ROOT, 'src', 'data');
const PUB = process.env.BX_PUBLIC ? path.resolve(process.env.BX_PUBLIC) : path.join(ROOT, 'public');

const errors: string[] = [];
const warnings: string[] = [];
const E = (m: string) => errors.push(m);
const P = (...a: string[]) => path.join(PACK, ...a);
const read = (f: string) => fs.readFileSync(P(f), 'utf8');
const exists = (f: string) => fs.existsSync(P(f));

function loadYaml<T>(file: string, schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: import('zod').ZodError } }, fallback: T): T {
  if (!exists(file)) { E(`${file}: missing`); return fallback; }
  let raw: unknown;
  try { raw = file.endsWith('.json') ? JSON.parse(read(file)) : yaml.load(read(file)); } catch (e) { E(`${file}: does not parse: ${(e as Error).message}`); return fallback; }
  const r = schema.safeParse(raw);
  if (!r.success) { errors.push(...zodLines(file, r.error).slice(0, 40)); return fallback; }
  return r.data;
}

function csv(file: string): { fields: string[]; rows: Record<string, string>[] } {
  if (!exists(file)) { E(`${file}: missing data file`); return { fields: [], rows: [] }; }
  const r = Papa.parse<Record<string, string>>(read(file), { header: true, skipEmptyLines: true, dynamicTyping: false });
  if (r.errors.length) for (const e of r.errors.slice(0, 5)) E(`${file}: CSV row ${e.row}: ${e.message}`);
  return { fields: r.meta.fields ?? [], rows: r.data };
}

const sortKeys = (o: Record<string, number>) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
const count = <T>(xs: T[], f: (x: T) => string | string[]) => {
  const out: Record<string, number> = {};
  for (const x of xs) for (const k of ([] as string[]).concat(f(x))) out[k] = (out[k] ?? 0) + 1;
  return sortKeys(out);
};

// ============================================================================================ 1. load + validate
const manifest = loadYaml('manifest.yaml', ManifestSchema, null as never);
if (!manifest) { console.error(errors.join('\n')); process.exit(1); }
const brand = loadYaml(manifest.brand.file, BrandSchema, null as never);
const glossary = loadYaml('glossary.yaml', GlossarySchema, []);
const figures = loadYaml('figures.yaml', FiguresSchema, []);
const references = loadYaml('references.yaml', ReferencesSchema, []);
const todo = loadYaml('todo.yaml', TodoSchema, []);
const scope = loadYaml('scope.yaml', ScopeSchema, null as never);
const ledger = loadYaml('claims-ledger.yaml', LedgerSchema, []);
const changes = loadYaml('changes.yaml', ChangesSchema, []);
const openItems = loadYaml('open-items.yaml', OpenItemsSchema, []);
const vstats = loadYaml('verification-stats.json', VerificationStatsSchema, null as never);
const layers = loadYaml('geo/layers.json', LayersSchema, [] as Layer[]);
const graph = loadYaml('figures/data/systems-graph.json', SystemsGraphSchema, null as never);
const indicators = loadYaml('systems/indicators.json', IndicatorsSchema, null as never);

const refByN = new Map(references.map((r) => [r.n, r]));
{
  const ns = references.map((r) => r.n);
  const dup = ns.filter((n, i) => ns.indexOf(n) !== i);
  if (dup.length) E(`references.yaml: duplicate n ${dup.join(', ')}`);
}
const checkRef = (n: number, where: string) => { if (!refByN.has(n)) E(`${where}: reference [${n}] is not in references.yaml`); };

// ============================================================================================ 2. review.md
const parsed = parseReview(read('review.md'));
errors.push(...parsed.errors);
const sectionIds = new Set(parsed.sections.map((s) => s.id));
const blockById = new Map(parsed.blocks.map((b) => [b.id, b]));
const figIds = new Set(figures.map((f) => f.id));
for (const f of parsed.figureMarkers) if (!figIds.has(f)) E(`review.md: figure marker ${f} is not in figures.yaml`);
for (const f of figures) if (!parsed.figureMarkers.includes(f.id)) warnings.push(`figures.yaml: ${f.id} has no <!-- figure --> marker in review.md`);

// section tree: part (depth 1 ancestor) and top (the strip/filter unit)
const sectionMeta: SectionMeta[] = [];
{
  let part = ''; let depth2 = '';
  for (const s of parsed.sections) {
    if (s.depth === 1) { part = s.id; depth2 = ''; }
    if (s.depth === 2) depth2 = s.id;
    const top = s.depth === 1 ? s.id : part === 'part-i' ? 'part-i' : depth2 || part;
    const words = s.chunks.reduce((n, c) => n + (c.k === 'b' ? claimWords(c.b.text) : c.k === 'list' ? c.items.reduce((m, b) => m + claimWords(b.text), 0) : 0), 0);
    sectionMeta.push({ id: s.id, title: s.title, depth: s.depth, top, part, words });
  }
}
const secMeta = new Map(sectionMeta.map((s) => [s.id, s]));
const topOf = (sid: string) => secMeta.get(sid)?.top ?? sid;

// citation coverage (APP-SPEC §6.1 rule 5) — counted per block as tools/validate_pack.py does
const uncited = parsed.blocks.filter((b) => b.kind !== 'table' && b.words >= 25 && b.cites.length === 0 && b.marker !== 'framing');
for (const b of uncited) E(`review.md ${b.id}: uncited block of ${b.words} words (cite it in the pack or mark it <!-- framing -->): ${b.text.slice(0, 80)}`);
for (const b of parsed.blocks) for (const n of b.cites) checkRef(n, `review.md ${b.id}`);

// ============================================================================================ 3. term linking
{
  const amb = findAmbiguousVariants(glossary);
  for (const a of amb) E(`glossary.yaml: variant "${a.variant}" is claimed by ${a.ids.join(', ')}`);
}
const matcher = buildMatcher(glossary);
const termOccurrences: Record<string, number> = {};
const termAppears: Record<string, Set<string>> = {};

function linkTermsIn(el: Element, m: Matcher, seen: Set<string>, sectionId: string | null, every = false): string[] {
  return linkTerms(el, m, seen, every, (id, linked) => {
    if (sectionId) termOccurrences[id] = (termOccurrences[id] ?? 0) + 1;
    if (linked && sectionId) (termAppears[id] ??= new Set()).add(sectionId);
  });
}

for (const s of parsed.sections) {
  const seen = new Set<string>();
  for (const c of s.chunks) {
    const bs = c.k === 'b' ? [c.b] : c.k === 'list' ? c.items : [];
    for (const b of bs) linkTermsIn(b.el, matcher, seen, s.id, manifest.link_every_occurrence);
  }
}

// ============================================================================================ 4. claim layer
const ledgerById = new Map(ledger.map((l) => [l.id, l]));
{
  const ids = ledger.map((l) => l.id);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) E(`claims-ledger.yaml: duplicate ids ${[...new Set(dup)].join(', ')}`);
}
const anchored = new Set<string>();
const anchorErrors: { id: string; block: string; reason: string; quote: string }[] = [];
const unanchoredByDesign: { id: string; block: string; status: string; quote: string; note: string; block_exists: boolean }[] = [];
for (const l of ledger) {
  for (const s of l.sources) checkRef(s.n, `claims-ledger.yaml ${l.id}`);
  if (!sectionIds.has(l.section) && l.status !== 'removed' && l.anchor_ok) E(`claims-ledger.yaml ${l.id}: unknown section ${l.section}`);
  if (l.status === 'removed') continue;
  if (!l.anchor_ok) { unanchoredByDesign.push({ id: l.id, block: l.block, status: l.status, quote: l.quote, note: l.note, block_exists: blockById.has(l.block) }); continue; }
  const b = blockById.get(l.block);
  if (!b) { E(`claims-ledger.yaml ${l.id}: block ${l.block} is not in review.md`); anchorErrors.push({ id: l.id, block: l.block, reason: 'unknown block', quote: l.quote }); continue; }
  const a = findAnchor(b.el, b.kind, l.quote);
  if (!a.ok) {
    E(`claims-ledger.yaml ${l.id}: anchor fails in ${l.block} — ${a.reason}: "${l.quote.slice(0, 90)}"`);
    anchorErrors.push({ id: l.id, block: l.block, reason: a.reason, quote: l.quote });
    continue;
  }
  if (wrapClaim(a.targets, l.id, statusGroup(l.status)!)) anchored.add(l.id);
}

// ============================================================================================ 5. changes + open items
for (const c of changes) {
  if (!blockById.has(c.block)) E(`changes.yaml ${c.id}: block ${c.block} is not in review.md`);
  if (!sectionIds.has(c.section)) E(`changes.yaml ${c.id}: unknown section ${c.section}`);
  for (const n of c.sources) checkRef(n, `changes.yaml ${c.id}`);
  for (const id of c.claims) if (!ledgerById.has(id)) E(`changes.yaml ${c.id}: claim ${id} is not in the ledger`);
  for (const m of c.new.matchAll(/\[(\d+)\]/g)) checkRef(Number(m[1]), `changes.yaml ${c.id} (new)`);
}
for (const o of openItems) {
  for (const b of o.blocks) if (!blockById.has(b)) E(`open-items.yaml ${o.id}: block ${b} is not in review.md`);
  for (const s of o.sections) if (!sectionIds.has(s)) E(`open-items.yaml ${o.id}: unknown section ${s}`);
}

const inlineCN = (md: string, opts: { terms?: boolean; seen?: Set<string> } = {}): { nodes: CNode[]; cites: number[] } => {
  const { root, cites } = inlineHast(md);
  if (opts.terms) linkTermsIn(root as unknown as Element, matcher, opts.seen ?? new Set(), null);
  // unwrap a single paragraph
  const kids = root.children.filter((c) => !(c.type === 'text' && !c.value.trim()));
  if (kids.length === 1 && kids[0].type === 'element' && kids[0].tagName === 'p') return { nodes: compactChildren(kids[0] as Element), cites };
  return { nodes: compactChildren(root as unknown as Element), cites };
};

const changeItems: ChangeItem[] = changes.map((c) => ({
  id: c.id, block: c.block, section: c.section, top: topOf(c.section), type: c.type, weight: c.weight, old: c.old, new: c.new,
  reason: inlineCN(c.reason).nodes, reason_text: c.reason, sources: c.sources, claims: c.claims, pass: c.pass, amends_revision: c.amends_revision,
  needs_author: c.needs_author, decision: c.decision, block_exists: blockById.has(c.block), order: sectionMeta.findIndex((m) => m.id === c.section),
}));
const readGroup = openItems.filter((o) => o.group === 'Could not be read').slice(0, 2).map((o) => o.id);
const openItemsOut: OpenItemT[] = openItems.map((o) => ({
  id: o.id, group: o.group, what: inlineCN(o.what).nodes, what_text: o.what, why: inlineCN(o.why).nodes, blocks: o.blocks, sections: o.sections,
  tops: [...new Set(o.sections.map(topOf))], looked: o.looked, who: o.who, how_to_close: inlineCN(o.how_to_close).nodes, pinned: readGroup.includes(o.id),
  block_refs: o.blocks.map((b) => ({ id: b, section: blockById.get(b)?.section ?? '', top: topOf(blockById.get(b)?.section ?? ''), exists: blockById.has(b) })),
}));

// ============================================================================================ 6. glossary, concepts, figures
const glossIds = new Set(glossary.map((g) => g.id));
const conceptFiles = exists('concepts') ? fs.readdirSync(P('concepts')).filter((f) => f.endsWith('.md')).sort() : [];
const conceptIdsOnDisk = new Set(conceptFiles.map((f) => f.replace(/\.md$/, '')));
for (const g of glossary) {
  if (g.concept && !conceptIdsOnDisk.has(g.concept)) E(`glossary.yaml ${g.id}: concept ${g.concept} has no concepts/${g.concept}.md`);
  for (const s of g.see) if (!glossIds.has(s)) E(`glossary.yaml ${g.id}: see → unknown term ${s}`);
  for (const n of g.refs) checkRef(n, `glossary.yaml ${g.id}`);
}
const glossaryOut: GlossaryItem[] = glossary.map((g) => {
  const d = inlineCN(g.definition);
  for (const n of d.cites) checkRef(n, `glossary.yaml ${g.id} (definition)`);
  return {
    id: g.id, term: g.term, kind: g.kind, category: g.category, variants: g.variants, short: g.short, def: d.nodes, concept: g.concept,
    see: g.see, refs: g.refs, sources: g.sources, appears: parsed.sections.map((s) => s.id).filter((sid) => termAppears[g.id]?.has(sid)),
  };
}).sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));

const conceptsOut: ConceptT[] = [];
const conceptCites = new Set<number>();
for (const f of conceptFiles) {
  const raw = read(`concepts/${f}`);
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
  if (!m) { E(`concepts/${f}: no YAML front matter`); continue; }
  const fm = ConceptFrontmatterSchema.safeParse(yaml.load(m[1]));
  if (!fm.success) { errors.push(...zodLines(`concepts/${f}`, fm.error)); continue; }
  const c = fm.data;
  if (`${c.id}.md` !== f) E(`concepts/${f}: id ${c.id} does not match the file name`);
  for (const p of c.prerequisites) if (!conceptIdsOnDisk.has(p)) E(`concepts/${f}: prerequisite ${p} unknown`);
  for (const t of c.terms) if (!glossIds.has(t)) E(`concepts/${f}: term ${t} is not in glossary.yaml`);
  for (const fig of c.figures) if (!figIds.has(fig)) E(`concepts/${f}: figure ${fig} unknown`);
  const tree = parseMarkdown(m[2]);
  // the citation-coverage gate applies to primer prose too (tools/validate_pack.py)
  for (const node of tree.children) {
    if (node.type !== 'paragraph') continue;
    const t = JSON.stringify(node);
    const words = claimWords(node.children.map((x) => ('value' in x ? x.value : '')).join(' '));
    if (words >= 25 && !/\[\d+\]/.test(t) && !/framing/.test(t)) warnings.push(`concepts/${f}: a paragraph of ${words} words has no citation`);
  }
  const h = toHast(tree as never) as unknown as HRoot;
  for (const n of linkCitations(h)) { checkRef(n, `concepts/${f}`); conceptCites.add(n); }
  linkTermsIn(h as unknown as Element, matcher, new Set(), null);
  conceptsOut.push({ ...c, body: compactChildren(h as unknown as Element) });
}
const conceptIds = new Set(conceptsOut.map((c) => c.id));
for (const g of glossary) if (g.concept && !conceptIds.has(g.concept)) E(`glossary.yaml ${g.id}: concept ${g.concept} did not load`);

const figuresOut: FigureT[] = [];
for (const f of figures) {
  for (const n of f.refs) checkRef(n, `figures.yaml ${f.id}`);
  for (const s of f.discussed_in) if (!sectionIds.has(s)) E(`figures.yaml ${f.id}: discussed_in ${s} is not a section`);
  for (const c of f.concepts) if (!conceptIds.has(c)) E(`figures.yaml ${f.id}: concept ${c} unknown`);
  for (const x of f.explain) { if (x.term && !glossIds.has(x.term)) E(`figures.yaml ${f.id}: explain term ${x.term} unknown`); if (x.concept && !conceptIds.has(x.concept)) E(`figures.yaml ${f.id}: explain concept ${x.concept} unknown`); }
  let rows: Record<string, string>[] = [];
  if (f.data.endsWith('.csv')) {
    const d = csv(f.data);
    rows = d.rows;
    const need = [f.chart?.x.field, f.chart?.y.field, f.chart?.series, ...(f.columns ?? []).map((c) => c.field)].filter(Boolean) as string[];
    for (const k of need) if (!d.fields.includes(k)) E(`figures.yaml ${f.id}: column ${k} is not in ${f.data}`);
    for (const r of rows) for (const n of String(r.ref ?? '').split(';').filter(Boolean)) checkRef(Number(n), `${f.data}`);
  } else if (!exists(f.data)) E(`figures.yaml ${f.id}: data file ${f.data} missing`);
  figuresOut.push({ ...f, rows });
}

// ============================================================================================ 7. maps
const al = csv('geo/al_counties.csv');
const us = csv('geo/us_states.csv');
const layerById = new Map(layers.map((l) => [l.id, l]));
for (const l of layers) checkRef(l.ref, `geo/layers.json ${l.id}`);
const AL_FIXED = ['fips', 'county'];
const US_FIXED = ['fips', 'abbr', 'state'];
for (const f of al.fields) if (!AL_FIXED.includes(f) && !(layerById.get(f)?.geography.includes('county'))) E(`geo/al_counties.csv: column ${f} has no county layer in layers.json`);
for (const f of us.fields) if (!US_FIXED.includes(f) && !(layerById.get(f)?.geography.includes('state'))) E(`geo/us_states.csv: column ${f} has no state layer in layers.json`);
for (const l of layers) {
  if (l.geography.includes('county') && !al.fields.includes(l.id)) E(`geo/layers.json ${l.id}: no column in geo/al_counties.csv`);
  if (l.geography.includes('state') && !us.fields.includes(l.id)) E(`geo/layers.json ${l.id}: no column in geo/us_states.csv`);
}
if (al.rows.length !== 67) E(`geo/al_counties.csv: ${al.rows.length} rows, expected 67`);
const usRows = us.rows.filter((r) => r.fips !== '00');
const usNational = us.rows.find((r) => r.fips === '00') ?? {};
if (usRows.length !== 51) E(`geo/us_states.csv: ${usRows.length} state rows, expected 51 (50 states and DC)`);

const layerType = (l: Layer): LayerT['type'] => (l.unit.startsWith('category') ? 'categorical' : l.unit.startsWith('date') ? 'date' : 'numeric');
function geoStat(l: Layer, rows: Record<string, string>[], key: string): GeoStat {
  const t = layerType(l);
  const vals = rows.map((r) => r[l.id] ?? '');
  const missing = rows.filter((r) => (r[l.id] ?? '') === '').map((r) => r[key]);
  if (t === 'numeric') {
    const nums = vals.map(cellNumber);
    vals.forEach((v, i) => { if (v !== '' && nums[i] === null) E(`${l.id}: non-numeric value "${v}" for ${rows[i][key]}`); });
    return { breaks: quantileBreaks(nums), published: nums.filter((x) => x !== null).length, missing };
  }
  const cats = count(vals.filter((v) => v !== ''), (v) => v);
  return { breaks: [], published: vals.filter((v) => v !== '').length, missing, categories: Object.entries(cats).map(([value, n]) => ({ value, count: n })) };
}
const layersOut: LayerT[] = layers.map((l) => ({
  ...l, type: layerType(l), picker: l.id !== 'medicaid_expansion_date',
  county: l.geography.includes('county') ? geoStat(l, al.rows, 'fips') : undefined,
  state: l.geography.includes('state') ? geoStat(l, usRows, 'fips') : undefined,
}));

// geometry
const alNames = new Map(al.rows.map((r) => [r.fips, r.county]));
const alGeo = alabamaGeometry(alNames, errors);
const usGeo = usGeometry(new Map(usRows.map((r) => [r.fips, { abbr: r.abbr, name: r.state }])), errors);
const colValues = (rows: Record<string, string>[], order: string[], geo: 'county' | 'state') => {
  const byF = new Map(rows.map((r) => [r.fips, r]));
  const out: Record<string, string[]> = {};
  for (const l of layers) if (l.geography.includes(geo)) out[l.id] = order.map((f) => byF.get(f)?.[l.id] ?? '');
  return out;
};
const alabamaRow = us.rows.find((r) => r.fips === '01') ?? {};

// overlays
const ov = JSON.parse(read('geo/overlays.json'));
const fipsOK = (fips: string[], where: string) => { for (const f of fips) if (!alNames.has(f)) E(`geo/overlays.json ${where}: FIPS ${f} is not an Alabama county`); };
const centroid = new Map(alGeo.areas.map((a) => [a.fips, [a.cx, a.cy] as [number, number]]));
const fipsByName = new Map(al.rows.map((r) => [r.county.toLowerCase(), r.fips]));
const overlaysOut: Overlay[] = [];
const countyInfo: Record<string, CountyOverlayInfo> = Object.fromEntries(al.rows.map((r) => [r.fips, { cmhc: null, crisis: null, mobile: [], region: null }]));
{
  const cm = ov.community_mental_health_centers;
  const ccbhcBy = new Map<string, { date: string | null; basis: string }>((ov.ccbhc.clinics as { center: string; date: string | null; basis: string }[]).map((c) => [c.center, { date: c.date, basis: c.basis }]));
  const groups = (cm.centers as { center: string; name_on_emergency_page: string; county_fips: string[]; ccbhc: boolean; ccbhc_date: string | null; ccbhc_basis: string | null }[]).map((c) => {
    fipsOK(c.county_fips, `community_mental_health_centers ${c.center}`);
    const cc = ccbhcBy.get(c.center);
    return { id: c.center, label: c.name_on_emergency_page, fips: c.county_fips, d: alGeo.mergeOf(c.county_fips), ccbhc: !!cc || c.ccbhc, ccbhc_date: cc?.date ?? c.ccbhc_date, ccbhc_basis: cc?.basis ?? c.ccbhc_basis };
  });
  for (const row of cm.county_lookup as { fips: string; center: string; emergency_page_listing: { provider: string; phone: string }[]; basis: string }[]) {
    const g = groups.find((x) => x.id === row.center);
    if (!countyInfo[row.fips]) { E(`geo/overlays.json county_lookup: FIPS ${row.fips} unknown`); continue; }
    countyInfo[row.fips].cmhc = { center: row.center, name: g?.label ?? row.center, basis: row.basis, listing: row.emergency_page_listing, ccbhc: !!g?.ccbhc, ccbhc_date: g?.ccbhc_date ?? null };
  }
  overlaysOut.push({
    id: 'cmhc', label: 'Community mental health center service areas', source_url: cm.source_url, as_of: cm.as_of, note: cm.note,
    disagreement: `${cm.note} CCBHCs: ${ov.ccbhc.note} ${(ov.ccbhc.clinics as { basis: string; date: string | null }[]).filter((c) => !c.date).map((c) => c.basis).join(' ')}`,
    groups,
  });
}
{
  const cc = ov.crisis_centers;
  const groups = (cc.centers as { name: string; catchment_fips: string[]; opened: string; opened_basis: string }[]).map((c, i) => {
    fipsOK(c.catchment_fips, `crisis_centers ${c.name}`);
    for (const f of c.catchment_fips) if (countyInfo[f]) countyInfo[f].crisis = { name: c.name, opened: c.opened };
    return { id: `crisis-${i + 1}`, label: c.name, fips: c.catchment_fips, d: alGeo.mergeOf(c.catchment_fips), opened: c.opened, extra: c.opened_basis };
  });
  fipsOK(cc.counties_without_center_fips, 'crisis_centers counties_without_center');
  overlaysOut.push({
    id: 'crisis', label: 'Crisis-center catchments', source_url: cc.centers[0]?.source_url ?? '', as_of: cc.centers[0]?.as_of ?? '', note: cc.note,
    disagreement: `A second ADMH page (${cc.second_source.source_url}, ${cc.second_source.as_of}) describes the catchments in its own words; the two are not identical (for example, Carastar "serves the entire River Region").`,
    verbatim: cc.second_source.text_verbatim, visual: 'Opening dates are read from ADMH\'s map image.',
    groups, unassigned: { label: 'Not listed for any center on ADMH\'s page', fips: cc.counties_without_center_fips, d: alGeo.mergeOf(cc.counties_without_center_fips) },
  });
}
{
  const mc = ov.mobile_crisis;
  const byGroup = new Map<string, { provider: string; fips: string[]; text: string }[]>();
  for (const p of mc.programs as { group: string; provider: string; county_fips: string[]; text: string }[]) {
    fipsOK(p.county_fips, `mobile_crisis ${p.provider}`);
    if (!byGroup.has(p.group)) byGroup.set(p.group, []);
    byGroup.get(p.group)!.push({ provider: p.provider, fips: p.county_fips, text: p.text });
    for (const f of p.county_fips) countyInfo[f]?.mobile.push(`${p.text} (${p.group})`);
  }
  const groups = [...byGroup.entries()].map(([g, ps], i) => {
    const fips = [...new Set(ps.flatMap((p) => p.fips))];
    return { id: `mobile-${i + 1}`, label: g, fips, d: alGeo.mergeOf(fips), extra: ps.map((p) => p.text).join('; ') };
  });
  fipsOK(mc.counties_from_page_text_fips, 'mobile_crisis page text');
  fipsOK(mc.counties_from_map_alt_text_fips, 'mobile_crisis map alt text');
  overlaysOut.push({
    id: 'mobile', label: 'Mobile crisis and rural crisis programmes', source_url: mc.source_url, as_of: mc.as_of, note: `${mc.counties_from_page_text_fips.length} counties named on ADMH's Rural Crisis Care page.`,
    disagreement: mc.note, groups, alt: { label: "Counties in the alt text of ADMH's mobile crisis map", fips: mc.counties_from_map_alt_text_fips },
  });
}
{
  const rg = ov.mental_illness_service_regions;
  const groups = (rg.regions as { region: string | number; county_fips: string[]; centers: string[] }[]).map((r) => {
    fipsOK(r.county_fips, `regions ${r.region}`);
    for (const f of r.county_fips) if (countyInfo[f]) countyInfo[f].region = String(r.region);
    return { id: `region-${r.region}`, label: `Region ${r.region}`, fips: r.county_fips, d: alGeo.mergeOf(r.county_fips), extra: `Centers labelled on the map: ${r.centers.join(', ')}` };
  });
  overlaysOut.push({ id: 'regions', label: 'ADMH mental-illness service regions', source_url: rg.source_url, as_of: rg.as_of, note: rg.note, visual: "Read from ADMH's map image.", groups });
}
{
  const markers: Omit<Marker2, 'x' | 'y'>[] = [];
  const unplaced: Overlay['unplaced'] = [];
  const cityCounty = new Map<string, string>();
  for (const c of ov.crisis_centers.centers) { cityCounty.set(c.city, c.county); markers.push({ kind: 'crisis', name: c.name, operator: c.operator, city: c.city, county: c.county, fips: fipsByName.get(String(c.county).toLowerCase()) ?? '', address: c.address, opened: c.opened, source_url: c.source_url, as_of: c.as_of, basis: c.county_basis }); }
  const pc = ov.pediatric_crisis_unit;
  markers.push({ kind: 'pediatric', name: pc.name, operator: pc.operator, city: pc.city, county: pc.county, fips: fipsByName.get(String(pc.county).toLowerCase()) ?? '', address: pc.address, note: pc.note, source_url: pc.source_url, as_of: pc.as_of });
  for (const c of ov.call_centers_988.centers as { operator: string; city: string }[]) {
    const county = cityCounty.get(c.city);
    if (!county) { unplaced.push({ kind: '988 call center', name: c.operator, note: `City ${c.city} only; no county in the file`, source_url: ov.call_centers_988.source_url }); continue; }
    markers.push({ kind: 'call988', name: `988 call center: ${c.operator}`, operator: c.operator, city: c.city, county, fips: fipsByName.get(county.toLowerCase()) ?? '', source_url: ov.call_centers_988.source_url, as_of: ov.call_centers_988.as_of, basis: `The file gives the city (${c.city}) only; the county is taken from the crisis-center record in the same file for the same city.` });
  }
  for (const h of ov.state_hospitals as { name: string; address: string | null; city: string | null; county: string | null; population: string; note?: string; source_url: string; as_of: string }[]) {
    if (!h.county) { unplaced.push({ kind: 'Hospital', name: h.name, note: h.note ?? h.population, source_url: h.source_url }); continue; }
    markers.push({ kind: 'hospital', name: h.name, city: h.city ?? '', county: h.county, fips: fipsByName.get(h.county.toLowerCase()) ?? '', address: h.address ?? '', note: h.population, source_url: h.source_url, as_of: h.as_of });
  }
  for (const s of ov.first_episode_psychosis_nova_sites.sites as { name: string; operator: string; county: string; county_fips: string }[]) {
    markers.push({ kind: 'nova', name: s.name, operator: s.operator, county: s.county, fips: s.county_fips, source_url: ov.first_episode_psychosis_nova_sites.source_url, as_of: ov.first_episode_psychosis_nova_sites.as_of });
  }
  for (const m of markers) if (!m.fips || !centroid.has(m.fips)) E(`geo/overlays.json: facility "${m.name}" county ${m.county} is not an Alabama county`);
  // spread markers that share a county around its centroid, deterministically
  const perCounty = new Map<string, number>();
  const totalIn = count(markers, (m) => m.fips);
  const placed: Marker2[] = markers.filter((m) => centroid.has(m.fips)).map((m) => {
    const k = perCounty.get(m.fips) ?? 0; perCounty.set(m.fips, k + 1);
    const n = totalIn[m.fips];
    const [cx, cy] = centroid.get(m.fips)!;
    const ang = (2 * Math.PI * k) / n - Math.PI / 2;
    const r = n > 1 ? 9 : 0;
    return { ...m, x: Math.round((cx + r * Math.cos(ang)) * 10) / 10, y: Math.round((cy + r * Math.sin(ang)) * 10) / 10 };
  });
  overlaysOut.push({
    id: 'facilities', label: 'Crisis centers, 988 call centers, hospitals and NOVA sites', source_url: ov.crisis_centers.centers[0]?.source_url ?? '', as_of: ov.retrieved,
    note: "Markers are placed at the county's centre, not at the street address (spread slightly where several share a county).", groups: [], markers: placed, unplaced,
  });
}
const alMap: AlMap = {
  width: alGeo.width, height: alGeo.height, areas: alGeo.areas, outline: alGeo.outline,
  values: colValues(al.rows, alGeo.areas.map((a) => a.fips), 'county'),
  stateValues: Object.fromEntries(layers.filter((l) => l.geography.includes('state')).map((l) => [l.id, alabamaRow[l.id] ?? ''])),
  overlays: overlaysOut, countyInfo,
};
const usMap: UsMap = {
  width: usGeo.width, height: usGeo.height, areas: usGeo.areas, values: colValues(usRows, usGeo.areas.map((a) => a.fips), 'state'),
  usRow: Object.fromEntries(layers.filter((l) => l.geography.includes('state')).map((l) => [l.id, usNational[l.id] ?? ''])),
};

// raw files for download
const rawSrc = P('geo', 'raw');
const rawDst = path.join(PUB, 'data', 'geo', 'raw');
const rawFiles: { name: string; bytes: number }[] = [];
if (fs.existsSync(rawSrc)) {
  fs.mkdirSync(rawDst, { recursive: true });
  for (const f of fs.readdirSync(rawSrc).sort()) {
    const src = path.join(rawSrc, f);
    if (!fs.statSync(src).isFile()) continue;
    fs.copyFileSync(src, path.join(rawDst, f));
    rawFiles.push({ name: f, bytes: fs.statSync(src).size });
  }
  for (const f of ['al_counties.csv', 'us_states.csv', 'layers.json', 'overlays.json', 'NOTES.md']) fs.copyFileSync(P('geo', f), path.join(PUB, 'data', 'geo', f));
} else E('geo/raw/: missing');
const geoNotes = exists('geo/NOTES.md') ? read('geo/NOTES.md') : '';

// ============================================================================================ 8. systems graph
const nodeIds = new Set(graph.nodes.map((n) => n.id));
for (const n of graph.nodes) if (!sectionIds.has(n.section)) E(`systems-graph.json node ${n.id}: section ${n.section} unknown`);
for (const e of graph.edges) {
  if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) E(`systems-graph.json edge ${e.id}: unknown node`);
  if (!blockById.has(e.block)) E(`systems-graph.json edge ${e.id}: block ${e.block} unknown`);
  for (const n of e.refs) checkRef(n, `systems-graph.json ${e.id}`);
}
for (const h of indicators.headline) {
  for (const n of h.nodes) if (!nodeIds.has(n)) E(`systems/indicators.json headline "${h.label}": node ${n} unknown`);
  if (!blockById.has(h.block)) E(`systems/indicators.json headline "${h.label}": block ${h.block} unknown`);
  for (const n of h.refs) checkRef(n, `systems/indicators.json "${h.label}"`);
}
for (const [node, list] of Object.entries(indicators.all_figures_by_node)) {
  if (!nodeIds.has(node)) E(`systems/indicators.json all_figures_by_node: node ${node} unknown`);
  for (const f of list) {
    if (!ledgerById.has(f.claim)) E(`systems/indicators.json ${node}: claim ${f.claim} not in the ledger`);
    if (!blockById.has(f.block)) E(`systems/indicators.json ${node}: block ${f.block} unknown`);
    for (const n of f.refs) checkRef(n, `systems/indicators.json ${f.claim}`);
  }
}
for (const [node, ls] of Object.entries(indicators.map_layers_by_node)) {
  if (!nodeIds.has(node)) E(`systems/indicators.json map_layers_by_node: node ${node} unknown`);
  for (const l of ls) if (!layerById.has(l)) E(`systems/indicators.json map_layers_by_node ${node}: layer ${l} not in layers.json`);
}
const systems: SystemsData = {
  nodes: graph.nodes.map((n) => ({ ...n, scope: inlineCN(n.scope, { terms: true, seen: new Set() }).nodes })),
  edges: graph.edges.map((e) => ({ ...e, evidence: inlineCN(e.evidence, { terms: true, seen: new Set() }).nodes, evidence_text: e.evidence })),
  reading: inlineCN(graph.reading).nodes,
  headline: indicators.headline, figures: indicators.all_figures_by_node, layers: indicators.map_layers_by_node,
};
const nodeBySection = new Map(graph.nodes.map((n) => [n.section, n.id]));

// ============================================================================================ 9. reader output
const toRBlock = (b: Block, synIndex: Map<string, string>): RBlock => {
  const out: RBlock = { id: b.id, kind: b.kind, marker: b.marker, h: compactChildren(b.el) };
  if (b.marker === 'synthesis') out.syn = synIndex.get(b.id);
  return out;
};
const synthesis: { id: string; block: string; section: string; excerpt: string }[] = [];
const synIndex = new Map<string, string>();
for (const b of parsed.blocks) if (b.marker === 'synthesis') { const id = `analysis-${b.id.replace('+', '-')}`; synIndex.set(b.id, id); synthesis.push({ id, block: b.id, section: b.section, excerpt: b.text.replace(/\s+/g, ' ').slice(0, 200) }); }
const reader: RSection[] = parsed.sections.map((s) => ({
  id: s.id, title: s.title, depth: s.depth, top: topOf(s.id),
  chunks: s.chunks.map((c): RChunk => c.k === 'b' ? { k: 'b', b: toRBlock(c.b, synIndex) } : c.k === 'list' ? { k: 'list', ordered: c.ordered, start: c.start, items: c.items.map((b) => toRBlock(b, synIndex)) } : c),
}));

const ledgerOut: LedgerItem[] = ledger.map((l) => ({
  id: l.id, block: l.block, section: l.section, kind: l.kind, status: l.status, quote: l.quote,
  original_claim: l.status === 'corrected' || l.status === 'updated' ? l.original_claim : '', sources: l.sources, looked: l.looked, note: l.note,
  checked: l.checked, anchored: anchored.has(l.id),
}));

// top-level strips
const tops: TopMeta[] = [];
for (const s of sectionMeta) {
  if (s.top !== s.id) continue;
  const inTop = (sid: string) => topOf(sid) === s.id;
  const node = nodeBySection.get(s.id) ?? null;
  tops.push({
    id: s.id, title: s.title,
    claims: ledger.filter((l) => inTop(l.section)).length,
    changes: changes.filter((c) => inTop(c.section)).length,
    substantive: changes.filter((c) => inTop(c.section) && c.weight === 'substantive').length,
    open: openItems.filter((o) => o.sections.some(inTop)).length,
    node, layers: node ? indicators.map_layers_by_node[node] ?? [] : [],
  });
}

// references: which are cited by the report body or its ledger, and which only by maps / glossary / primers
const bodyCites = new Set(parsed.blocks.flatMap((b) => b.cites));
const ledgerCites = new Set(ledger.flatMap((l) => l.sources.map((s) => s.n)));
const auxCites = new Set<number>([...layers.map((l) => l.ref), ...glossary.flatMap((g) => g.refs), ...conceptCites]);
for (const g of glossary) for (const m of g.definition.matchAll(/\[(\d+)\]/g)) auxCites.add(Number(m[1]));
const otherCites = new Set<number>([...figures.flatMap((f) => f.refs), ...graph.edges.flatMap((e) => e.refs), ...indicators.headline.flatMap((h) => h.refs), ...changes.flatMap((c) => c.sources)]);
const refsOut: RefT[] = references.map((r) => {
  for (const s of r.cited_in) if (!sectionIds.has(s)) E(`references.yaml [${r.n}]: cited_in ${s} is not a section`);
  const inBody = bodyCites.has(r.n);
  const inLedger = ledgerCites.has(r.n);
  // cited only by the maps, glossary or primers — or by nothing at all (a warning), which KICKOFF's 297–329 group also holds
  const aux = !inBody && !inLedger && !otherCites.has(r.n);
  if (!inBody && !inLedger && !auxCites.has(r.n) && !otherCites.has(r.n)) warnings.push(`references.yaml [${r.n}]: cited nowhere`);
  return {
    n: r.n, tier: r.tier, citation: r.citation, title: r.title, publisher: r.publisher, published: r.published, url: r.url, year: r.year,
    summary: r.summary, why_it_mattered: r.why_it_mattered, role_here: r.role_here, role_note: r.role_note, cited_in: r.cited_in, verified: r.verified,
    read: r.read, accessed: r.accessed, doc_type: r.doc_type, register_code: r.register_code, url_status: r.url_status, newer_edition: r.newer_edition,
    anchor: r.anchor, aux, ledger_only: !inBody && inLedger,
  };
});
const unverifiedCited = refsOut.filter((r) => !r.verified && bodyCites.has(r.n)).map((r) => r.n);
for (const n of unverifiedCited) E(`review.md cites [${n}], which is verified: false (APP-SPEC §6.1 rule 7)`);

// ============================================================================================ 10. search index
const docs: SearchDoc[] = [];
const secTitle = (sid: string) => secMeta.get(sid)?.title ?? sid;
for (const b of parsed.blocks) docs.push({ id: `block:${b.id}`, kind: 'block', title: `${secTitle(b.section)} · ${b.id}`, text: b.text.replace(/\s+/g, ' ').trim(), to: `/read#b-${b.id.replace('+', '-')}`, section: secTitle(b.section) });
for (const r of references) docs.push({ id: `ref:${r.n}`, kind: 'reference', title: `[${r.n}] ${r.title}`, text: `${r.publisher}. ${r.summary}`, to: `/references#ref-${r.n}` });
for (const g of glossary) docs.push({ id: `term:${g.id}`, kind: 'term', title: g.term, text: `${g.variants.join(' · ')} — ${g.short}`, to: `/glossary#term-${g.id}` });
for (const c of conceptsOut) docs.push({ id: `primer:${c.id}`, kind: 'primer', title: c.title, text: `${c.one_liner} ${cnText(c.body)}`, to: `/concepts/${c.id}` });
for (const f of figures) docs.push({ id: `figure:${f.id}`, kind: 'figure', title: `${f.label}. ${f.title}`, text: f.caption, to: `/figures/${f.id}` });
for (const c of changes) docs.push({ id: `change:${c.id}`, kind: 'change', title: `${c.id} · ${c.type} · ${secTitle(c.section)}`, text: `${c.old} → ${c.new} — ${c.reason}`, to: `/changes?id=${c.id}` });
for (const o of openItems) docs.push({ id: `oi:${o.id}`, kind: 'open-item', title: `${o.id} · ${o.group}`, text: `${o.what} ${o.why}`, to: `/open-items#${o.id}` });
for (const l of layers) docs.push({ id: `layer:${l.id}`, kind: 'layer', title: l.label, text: `${l.group}. ${l.definition}`, to: l.geography.includes('county') ? `/map/alabama?layer=${l.id}` : `/map/us?layer=${l.id}` });
for (const r of al.rows) docs.push({ id: `county:${r.fips}`, kind: 'county', title: `${r.county} County`, text: `${r.county} County, Alabama`, to: `/map/alabama?layer=pop_est&geo=${r.fips}` });
for (const r of usRows) docs.push({ id: `state:${r.fips}`, kind: 'state', title: r.state, text: `${r.state} (${r.abbr})`, to: `/map/us?layer=mha_overall_rank&geo=${r.fips}` });
for (const n of graph.nodes) docs.push({ id: `node:${n.id}`, kind: 'node', title: n.title, text: `${n.label}. ${n.scope}`, to: `/systems?node=${n.id}` });
for (const e of graph.edges) docs.push({ id: `edge:${e.id}`, kind: 'edge', title: `${e.pair}: ${e.link}`, text: e.evidence, to: `/systems?edge=${e.id}` });
const mini = new MiniSearch<SearchDoc>(MINISEARCH_OPTIONS);
mini.addAll(docs);

function cnText(nodes: CNode[]): string {
  return nodes.map((n) => (typeof n === 'string' ? n : cnText(n.slice(2) as CNode[]))).join(' ');
}

// ============================================================================================ 11. provenance + emit
const linkedTerms = Object.keys(termAppears);
const occurringTerms = Object.keys(termOccurrences).filter((k) => termOccurrences[k] > 0);
const termsNotInText = glossary.filter((g) => !termOccurrences[g.id]).map((g) => g.id);
const conceptReach = conceptsOut.map((c) => ({ id: c.id, from_terms: glossary.filter((g) => g.concept === c.id).length, from_figures: figures.filter((f) => f.concepts.includes(c.id)).length }));
for (const c of conceptReach) if (!c.from_terms && !c.from_figures) warnings.push(`concepts/${c.id}: not reachable from any term or figure`);

const provenance = {
  generated_by: `${manifest.builder.name} ${manifest.builder.version}`,
  mode: manifest.mode,
  as_of: manifest.as_of,
  report_version: manifest.report.version,
  words: parsed.blocks.reduce((n, b) => n + claimWords(b.text), 0),
  sections: parsed.sections.length,
  blocks: { total: parsed.blocks.length, by_kind: count(parsed.blocks, (b) => b.kind), cited: parsed.blocks.filter((b) => b.cites.length).length, framing: parsed.blocks.filter((b) => b.marker === 'framing').length, synthesis: synthesis.length, uncited: uncited.length },
  terms: { glossary: glossary.length, occurring_in_text: occurringTerms.length, linked: linkedTerms.length, linked_pct: occurringTerms.length ? Math.round((1000 * linkedTerms.length) / occurringTerms.length) / 10 : 100, not_in_text: termsNotInText },
  references: {
    total: references.length, with_summary: references.filter((r) => r.summary.trim()).length, without_summary: references.filter((r) => !r.summary.trim()).length,
    by_tier: count(references, (r) => r.tier), by_read: count(references, (r) => r.read), by_doc_type: count(references, (r) => r.doc_type),
    with_newer_edition: references.filter((r) => r.newer_edition).map((r) => r.n), url_status: count(references.filter((r) => r.url_status), (r) => r.url_status!),
    cited_in_body: bodyCites.size, ledger_only: refsOut.filter((r) => r.ledger_only).map((r) => r.n), maps_glossary_primers_only: refsOut.filter((r) => r.aux).map((r) => r.n),
    unverified_but_cited: unverifiedCited.length,
  },
  ledger: {
    entries: ledger.length, by_status: count(ledger, (l) => l.status), by_kind: count(ledger, (l) => l.kind),
    anchored: anchored.size, unanchored_by_design: unanchoredByDesign.length, removed: ledger.filter((l) => l.status === 'removed').length, anchor_errors: anchorErrors.length,
  },
  changes: { total: changes.length, by_type: count(changes, (c) => c.type), by_weight: count(changes, (c) => c.weight), by_pass: count(changes, (c) => c.pass), needs_author: changes.filter((c) => c.needs_author).length, amends_revision: changes.filter((c) => c.amends_revision).length },
  open_items: { total: openItems.length, by_group: count(openItems, (o) => o.group), by_who: count(openItems, (o) => o.who) },
  figures: { total: figures.length, by_kind: count(figures, (f) => f.kind), by_synthesis: count(figures, (f) => f.synthesis) },
  concepts: conceptsOut.length,
  maps: {
    layers: layers.length, by_geography: count(layers, (l) => l.geography), by_group: count(layers, (l) => l.group),
    counties: al.rows.length, states: usRows.length,
    empty_cells: Object.fromEntries(layersOut.filter((l) => (l.county?.missing.length ?? 0) + (l.state?.missing.length ?? 0) > 0).map((l) => [l.id, { county: l.county?.missing.length ?? 0, state: l.state?.missing.length ?? 0 }])),
    overlay_records: Object.fromEntries(overlaysOut.map((o) => [o.id, o.id === 'facilities' ? (o.markers?.length ?? 0) + (o.unplaced?.length ?? 0) : o.groups.length])),
    raw_files: rawFiles.length,
  },
  systems: { nodes: graph.nodes.length, edges: graph.edges.length, rows: new Set(graph.edges.map((e) => e.row)).size, headline_indicators: indicators.headline.length },
  todo_author: todo.length,
  search_documents: docs.length,
  build_errors: errors.length,
};

const methods = {
  scope, todo, synthesis, framing: provenance.blocks.framing, unanchoredByDesign, anchorErrors, errors: [...errors], warnings,
  termsNotInText, conceptReach, verificationStats: vstats, geoNotes, rawFiles, provenance,
};

const core = {
  manifest: {
    slug: manifest.slug, title: manifest.title, short_title: manifest.short_title, subtitle: manifest.subtitle, question: manifest.question,
    as_of: manifest.as_of, authors: manifest.authors, venue: manifest.venue, year: manifest.year, report: manifest.report, plain_abstract: manifest.plain_abstract,
    reading_minutes: manifest.reading_minutes, audience: manifest.audience, palette: manifest.palette, permissions: manifest.permissions,
    github_account: manifest.github_account, notes_storage: manifest.notes_storage, builder: manifest.builder, banner: manifest.banner, draft: manifest.draft,
  },
  brand, stats: vstats, sections: sectionMeta, tops,
  counts: {
    references: references.length, glossary: glossary.length, primers: conceptsOut.length, figures: figures.length, layers: layers.length,
    counties: al.rows.length, states: usRows.length, nodes: graph.nodes.length, edges: graph.edges.length, rows: provenance.systems.rows,
    changes: changes.length, substantive: changes.filter((c) => c.weight === 'substantive').length, open_items: openItems.length, ledger: ledger.length,
    build_errors: errors.length,
  },
  concepts: conceptsOut.map((c) => ({ id: c.id, title: c.title, one_liner: c.one_liner })),
  figures: figures.map((f) => ({ id: f.id, label: f.label, title: f.title, kind: f.kind })),
  layersBrief: layers.map((l) => ({ id: l.id, label: l.label, geography: l.geography })),
};

const glossaryShort = Object.fromEntries(glossary.map((g) => [g.id, { term: g.term, short: g.short, concept: g.concept }]));

fs.mkdirSync(OUT, { recursive: true });
const emit = (name: string, data: unknown) => fs.writeFileSync(path.join(OUT, name), JSON.stringify(data) + '\n');
emit('core.json', core);
// the reader in two chunks: the opening sections paint first, the rest arrives right after (KICKOFF §5 Lighthouse bar)
{
  let size = 0; let cut = 0;
  for (; cut < reader.length; cut++) { size += JSON.stringify(reader[cut]).length; if (size > 30_000 && (reader[cut + 1]?.depth ?? 9) <= 2) { cut++; break; } }
  emit('reader-1.json', reader.slice(0, cut));
  emit('reader-2.json', reader.slice(cut));
}
if (fs.existsSync(path.join(OUT, 'reader.json'))) fs.unlinkSync(path.join(OUT, 'reader.json'));
emit('ledger.json', ledgerOut);
emit('references.json', refsOut);
emit('glossary.json', glossaryOut);
emit('glossary-short.json', glossaryShort);
emit('concepts.json', conceptsOut);
emit('figures.json', figuresOut);
emit('changes.json', changeItems);
emit('open-items.json', openItemsOut);
emit('layers.json', layersOut);
emit('map-al.json', alMap);
emit('map-us.json', usMap);
emit('systems.json', systems);
emit('search.json', mini.toJSON());
emit('methods.json', methods);
fs.mkdirSync(PUB, { recursive: true });
fs.writeFileSync(path.join(PUB, 'provenance.json'), JSON.stringify(provenance, null, 2) + '\n');

const errFile = P('BUILD-ERRORS.md');
// --accept-known (CI): the build still lists every error, but exits 0 when each one is already recorded in the
// committed BUILD-ERRORS.md — a ratchet: any new error fails the build, and fixing one updates the file.
const known = new Set(fs.existsSync(errFile) ? fs.readFileSync(errFile, 'utf8').split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2)) : []);
const acceptKnown = process.argv.includes('--accept-known');
if (errors.length) {
  fs.writeFileSync(errFile, `# BUILD-ERRORS — content build of ${manifest.slug}\n\nWritten by \`npm run build:content\`. ${errors.length} error(s); the app was built from whatever validated, and lists these on /methods.\n\n${errors.map((e) => `- ${e}`).join('\n')}\n`);
} else if (fs.existsSync(errFile)) fs.unlinkSync(errFile);

// ---------------------------------------------------------------------------------------- summary
const table: [string, string | number][] = [
  ['sections', parsed.sections.length], ['blocks (p / li / table)', `${parsed.blocks.length} (${provenance.blocks.by_kind.p ?? 0} / ${provenance.blocks.by_kind.li ?? 0} / ${provenance.blocks.by_kind.table ?? 0})`],
  ['words', provenance.words], ['cited / framing / analysis blocks', `${provenance.blocks.cited} / ${provenance.blocks.framing} / ${provenance.blocks.synthesis}`],
  ['uncited blocks', uncited.length], ['references', references.length], ['glossary terms linked / occurring', `${linkedTerms.length} / ${occurringTerms.length}`],
  ['ledger entries / anchored', `${ledger.length} / ${anchored.size}`], ['unanchored by design (anchor_ok false)', unanchoredByDesign.length], ['anchor errors', anchorErrors.length],
  ['changes (substantive)', `${changes.length} (${core.counts.substantive})`], ['open items', openItems.length], ['primers', conceptsOut.length], ['figures', figures.length],
  ['map layers / counties / states', `${layers.length} / ${al.rows.length} / ${usRows.length}`], ['graph nodes / edges', `${graph.nodes.length} / ${graph.edges.length}`],
  ['search documents', docs.length], ['warnings', warnings.length], ['ERRORS', errors.length],
];
console.log('\ncontent build — summary');
for (const [k, v] of table) console.log(`  ${k.padEnd(42)} ${v}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s) — written to content-pack/BUILD-ERRORS.md:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  const fresh = errors.filter((e) => !known.has(e));
  if (acceptKnown && fresh.length === 0) {
    console.error(`\n--accept-known: all ${errors.length} error(s) are the known pack errors recorded in BUILD-ERRORS.md; exiting 0.`);
    process.exit(0);
  }
  if (acceptKnown) console.error(`\n--accept-known: ${fresh.length} error(s) are new:\n${fresh.map((e) => `  ✗ ${e}`).join('\n')}`);
  process.exit(1);
}
