/** Shapes of the generated data in src/data/*.json (written by scripts/build-content.ts). */

/** Compact hast: a string, or [tag, props | 0, ...children]. Custom tags: x-cite {n}, x-term {id}, x-claim {id, g}. */
export type CNode = string | [string, Record<string, unknown> | 0, ...CNode[]];

export type Marker = 'framing' | 'synthesis' | null;
export type StatusGroup = 'verified' | 'changed' | 'resourced' | 'own' | 'notfound' | 'unsourced';

export interface RBlock { id: string; kind: 'p' | 'li' | 'table'; marker: Marker; h: CNode[]; syn?: string }
export type RChunk = { k: 'b'; b: RBlock } | { k: 'list'; ordered: boolean; start: number | null; items: RBlock[] } | { k: 'fig'; id: string };
export interface RSection { id: string; title: string; depth: number; top: string; chunks: RChunk[] }

export interface SectionMeta { id: string; title: string; depth: number; top: string; part: string; words: number }
export interface TopMeta {
  id: string; title: string; claims: number; changes: number; substantive: number; open: number;
  node: string | null; layers: string[];
}

export interface Reference {
  n: number; tier: 'seminal' | 'classic' | 'current' | 'background'; citation: string; title: string; publisher: string; published: string;
  url: string; year: number; summary: string; why_it_mattered: string; role_here: string; role_note: string; cited_in: string[];
  verified: boolean; read: 'full' | 'partial'; accessed: string; doc_type: string; register_code: string;
  url_status?: string; newer_edition?: { title: string; published?: string; url?: string; note?: string }; anchor: boolean;
  /** cited only by the maps, the glossary or the primers (not by the report or its ledger) */
  aux: boolean; ledger_only: boolean;
}

export interface LedgerSource { n: number; quote: string; locator: string }
export interface LedgerItem {
  id: string; block: string; section: string; kind: string; status: string; quote: string; original_claim: string;
  sources: LedgerSource[]; looked: string; note: string; checked: string; anchored: boolean;
}

export interface ChangeItem {
  id: string; block: string; section: string; top: string; type: string; weight: 'substantive' | 'minor'; old: string; new: string;
  reason: CNode[]; reason_text: string; sources: number[]; claims: string[]; pass: string; amends_revision: boolean; needs_author: boolean; decision: string;
  block_exists: boolean; order: number;
}

export interface OpenItemT {
  id: string; group: string; what: CNode[]; what_text: string; why: CNode[]; blocks: string[]; sections: string[]; tops: string[];
  looked: string[]; who: 'author' | 'anyone-with-a-browser' | 'next-review'; how_to_close: CNode[]; pinned: boolean;
  block_refs: { id: string; section: string; top: string; exists: boolean }[];
}

export interface GlossaryItem {
  id: string; term: string; kind: string; category: string; variants: string[]; short: string; def: CNode[];
  concept?: string; see: string[]; refs: number[]; sources: string[]; appears: string[];
}
export interface GlossaryShort { id: string; term: string; short: string; concept?: string }

export interface ConceptT {
  id: string; title: string; one_liner: string; why_here: string; prerequisites: string[]; terms: string[]; figures: string[];
  further_reading: { title: string; url: string; kind?: string }[];
  self_check: { q: string; options: string[]; answer: number; explanation: string }[];
  body: CNode[];
}

export interface FigureT {
  id: string; label: string; title: string; kind: 'chart' | 'table' | 'network'; synthesis: 'data' | 'conceptual'; refs: number[];
  chart?: { type: 'bar' | 'grouped-bar'; x: { field: string; label?: string; unit?: string }; y: { field: string; label?: string; unit?: string }; series?: string };
  columns?: { field: string; label: string }[]; data: string; caption: string; how_to_read: string;
  explain: { on: string; text: string; term?: string; concept?: string }[]; concepts: string[]; discussed_in: string[]; source: string;
  rows: Record<string, string>[];
}

export interface GeoStat { breaks: number[]; published: number; missing: string[]; categories?: { value: string; count: number }[] }
export interface LayerT {
  id: string; label: string; unit: string; geography: ('county' | 'state')[]; definition: string; higher_is: 'better' | 'worse' | 'neutral';
  source_title: string; publisher: string; vintage: string; url: string; data_url: string; retrieved: string; retrieval: string;
  suppressed_note: string; caveats: string; ref: number; group: string;
  type: 'numeric' | 'categorical' | 'date'; picker: boolean; county?: GeoStat; state?: GeoStat;
}

export interface MapArea { fips: string; name: string; abbr?: string; d: string; cx: number; cy: number }

export interface OverlayGroup { id: string; label: string; fips: string[]; d: string; ccbhc?: boolean; ccbhc_date?: string | null; ccbhc_basis?: string | null; opened?: string; extra?: string }
export interface Marker2 { kind: 'crisis' | 'pediatric' | 'call988' | 'hospital' | 'nova'; name: string; operator?: string; city?: string; county: string; fips: string; x: number; y: number; address?: string; note?: string; opened?: string; source_url: string; as_of: string; basis?: string }
export interface Overlay {
  id: 'cmhc' | 'crisis' | 'mobile' | 'regions' | 'facilities'; label: string; source_url: string; as_of: string; note: string;
  disagreement?: string; verbatim?: string[]; visual?: string; groups: OverlayGroup[]; unassigned?: { label: string; fips: string[]; d: string };
  markers?: Marker2[]; unplaced?: { kind: string; name: string; note: string; source_url: string }[]; alt?: { label: string; fips: string[] };
}
export interface CountyOverlayInfo {
  cmhc: { center: string; name: string; basis: string; listing: { provider: string; phone: string }[]; ccbhc: boolean; ccbhc_date: string | null } | null;
  crisis: { name: string; opened: string } | null;
  mobile: string[];
  region: string | null;
}

export interface AlMap { width: number; height: number; areas: MapArea[]; outline: string; values: Record<string, string[]>; stateValues: Record<string, string>; overlays: Overlay[]; countyInfo: Record<string, CountyOverlayInfo> }
export interface UsMap { width: number; height: number; areas: MapArea[]; values: Record<string, string[]>; usRow: Record<string, string> }

export interface GraphNode { id: string; label: string; title: string; kind: 'domain' | 'cross-sector'; number: number; section: string; scope: CNode[]; admh_plan_goals: string[] }
export interface GraphEdge { id: string; from: string; to: string; row: number; pair: string; link: string; evidence: CNode[]; evidence_text: string; refs: number[]; block: string }
export interface Headline { label: string; alabama: string; united_states: string; rank_of_51: string; note: string; refs: number[]; nodes: string[]; block: string }
export interface NodeFigure { claim: string; text: string; status: string; refs: number[]; section: string; block: string }
export interface SystemsData { nodes: GraphNode[]; edges: GraphEdge[]; reading: CNode[]; headline: Headline[]; figures: Record<string, NodeFigure[]>; layers: Record<string, string[]> }
