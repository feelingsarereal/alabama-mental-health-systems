/**
 * Data access. core.json (manifest, brand, section index, counts) is bundled with the shell; everything heavier is
 * its own chunk, loaded on first use and cached, so /read does not pay for the maps or the search index.
 */
import { useEffect, useState } from 'react';
import core from '@/data/core.json';
import type {
  RSection, LedgerItem, Reference, GlossaryItem, ConceptT, FigureT, ChangeItem, OpenItemT, LayerT, AlMap, UsMap, SystemsData, SectionMeta, TopMeta,
} from '@/types';

export const manifest = core.manifest;
export const brand = core.brand;
export const stats = core.stats;
export const counts = core.counts;
export const SLUG = manifest.slug;
export const AS_OF = manifest.as_of;
export const sectionsIndex = core.sections as SectionMeta[];
export const tops = core.tops as TopMeta[];
export const conceptsIndex = core.concepts;
export const figuresIndex = core.figures;
export const layersBrief = core.layersBrief as { id: string; label: string; geography: string[] }[];

const secById = new Map(sectionsIndex.map((s) => [s.id, s]));
export const getSection = (id: string | null | undefined) => (id ? secById.get(id) : undefined);
export const topById = new Map(tops.map((t) => [t.id, t]));

export function fmtDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${Number(m[3])} ${months[Number(m[2]) - 1]} ${m[1]}`;
}
export const AS_OF_TEXT = fmtDate(AS_OF);

function lazy<T>(f: () => Promise<{ default: unknown }>) {
  let p: Promise<T> | null = null;
  let v: T | undefined;
  const load = () => (p ??= f().then((m) => { v = m.default as T; return v; }));
  return { load, peek: () => v };
}

export const D = {
  reader1: lazy<RSection[]>(() => import('@/data/reader-1.json')),
  reader2: lazy<RSection[]>(() => import('@/data/reader-2.json')),
  reader: lazy<RSection[]>(() => Promise.all([import('@/data/reader-1.json'), import('@/data/reader-2.json')]).then(([a, b]) => ({ default: [...(a.default as RSection[]), ...(b.default as RSection[])] }))),
  ledger: lazy<LedgerItem[]>(() => import('@/data/ledger.json')),
  references: lazy<Reference[]>(() => import('@/data/references.json')),
  glossary: lazy<GlossaryItem[]>(() => import('@/data/glossary.json')),
  glossaryShort: lazy<Record<string, { term: string; short: string; concept?: string }>>(() => import('@/data/glossary-short.json')),
  concepts: lazy<ConceptT[]>(() => import('@/data/concepts.json')),
  figures: lazy<FigureT[]>(() => import('@/data/figures.json')),
  changes: lazy<ChangeItem[]>(() => import('@/data/changes.json')),
  openItems: lazy<OpenItemT[]>(() => import('@/data/open-items.json')),
  layers: lazy<LayerT[]>(() => import('@/data/layers.json')),
  mapAl: lazy<AlMap>(() => import('@/data/map-al.json')),
  mapUs: lazy<UsMap>(() => import('@/data/map-us.json')),
  systems: lazy<SystemsData>(() => import('@/data/systems.json')),
  methods: lazy<MethodsData>(() => import('@/data/methods.json')),
};

export interface MethodsData {
  scope: {
    topic: string; question: string; purpose: string; boundary: { in: string[]; out: string[]; rationale: string }; level: string; stance: string; depth: string;
    time_window: Record<string, string | number>; anchors: { citation: string; why: string }[]; excluded: { what: string; why: string }[];
    interview: { q: string; answer: string; asked: string }[];
    search_strategy: { run_on: string; sources: string[]; queries: { q: string; source: string; hits: number; kept: number }[]; snowball: string[]; inclusion: string[]; exclusion: string[]; known_gaps: string[] };
    corpus_profile: { by_tier: Record<string, number>; year_range: [number, number]; concentration: string; dissent_represented: boolean };
  };
  todo: { where: string; what: string }[];
  synthesis: { id: string; block: string; section: string; excerpt: string }[];
  framing: number;
  unanchoredByDesign: { id: string; block: string; status: string; quote: string; note: string; block_exists: boolean }[];
  anchorErrors: { id: string; block: string; reason: string; quote: string }[];
  errors: string[]; warnings: string[]; termsNotInText: string[];
  conceptReach: { id: string; from_terms: number; from_figures: number }[];
  verificationStats: typeof core.stats;
  geoNotes: string; rawFiles: { name: string; bytes: number }[];
  provenance: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/** Load a lazy chunk and re-render when it arrives. */
export function useData<T>(l: { load: () => Promise<T>; peek: () => T | undefined }): T | undefined {
  const [v, setV] = useState<T | undefined>(l.peek());
  useEffect(() => {
    let live = true;
    if (v === undefined) l.load().then((x) => { if (live) setV(x); });
    return () => { live = false; };
  }, [l, v]);
  return v;
}

export function blockDomId(id: string): string {
  return `b-${id.replace('+', '-')}`;
}

export function blockHref(id: string): string {
  return `/read#${blockDomId(id)}`;
}

export function sectionTitle(id: string): string {
  return getSection(id)?.title ?? id;
}
