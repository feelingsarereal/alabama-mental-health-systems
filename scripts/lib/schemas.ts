/**
 * Zod schemas for the content pack: the standard files mirror docs/CONTENT-PACK.md (topic mode) and
 * tools/validate_pack.py; the extension files (claims-ledger.yaml, changes.yaml, open-items.yaml,
 * verification-stats.json, geo/, systems/indicators.json, figures/data/systems-graph.json, brand/) follow
 * KICKOFF §4b–4g, which is their only spec. Anything the content build accepts is declared here.
 */
import { z } from 'zod';

export const kebab = z.string().regex(/^[a-z0-9-]+$/, 'must be kebab-case');
export const BLOCK_ID = /^B\d{4}(\+\d+)?$/;
export const blockId = z.string().regex(BLOCK_ID, 'block id must be B0000 or B0000+n');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const ManifestSchema = z
  .object({
    mode: z.literal('topic'),
    slug: kebab,
    title: z.string().min(1),
    short_title: z.string().min(1),
    subtitle: z.string().default(''),
    question: z.string().min(1),
    purpose: z.string().min(1),
    as_of: isoDate,
    authors: z.array(z.string().min(1)).min(1),
    venue: z.string().min(1),
    year: z.number().int(),
    report: z.object({
      publisher: z.string(), role: z.string(), version: z.string(), based_on: z.string(), supersedes: z.string(),
      status: z.string(), intended_home: z.string(),
    }),
    plain_abstract: z.string().min(1),
    reading_minutes: z.number().optional(),
    audience: z.string().optional(),
    palette: z.object({ groups: z.record(z.string().regex(/^#[0-9a-f]{6}$/i)) }),
    permissions: z.object({ text: z.string().min(1, 'permissions.text is REQUIRED'), figures: z.string().optional() }),
    delivery: z.enum(['local', 'pages']),
    github_account: z.string().min(1),
    notes_storage: z.enum(['file', 'browser']).default('file'),
    link_every_occurrence: z.boolean().default(false),
    builder: z.object({ name: z.string(), version: z.string(), date: z.string().optional() }),
    draft: z.boolean().default(false),
    banner: z.object({ text: z.string().min(1), links: z.array(z.object({ label: z.string(), to: z.string() })) }),
    brand: z.object({ file: z.string() }),
    extensions: z.record(z.unknown()),
  })
  .superRefine((m, ctx) => {
    if (!/peer/i.test(m.venue)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['venue'], message: 'venue must carry the non-peer-reviewed statement' });
    if (m.delivery === 'pages' && !/25 words/i.test(m.permissions.text)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['permissions', 'text'], message: 'delivery: pages needs permissions.text to state the 25-word quotation rule' });
    }
    for (const k of ['verified', 'changed', 'open', 'domain', 'cross_sector', 'alabama', 'united_states']) {
      if (!m.palette.groups[k]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['palette', 'groups', k], message: `palette.groups.${k} is required` });
    }
  });
export type Manifest = z.infer<typeof ManifestSchema>;

export const BrandSchema = z.object({
  organisation: z.string(), address: z.string(), email: z.string(), website: z.string(), tagline: z.string(),
  logo: z.string(), logo_note: z.string().optional(),
  colors: z.record(z.string().regex(/^#[0-9a-f]{6}$/i)), colors_source: z.string().optional(),
  type: z.object({ body: z.string(), headings: z.string(), note: z.string().optional() }),
});
export type Brand = z.infer<typeof BrandSchema>;

export const GLOSSARY_KINDS = ['science', 'methods', 'statistics', 'notation'] as const;
export const GLOSSARY_CATEGORIES = ['law', 'finance', 'programme', 'service', 'organisation', 'data', 'workforce', 'framework', 'abbreviation'] as const;
export const GlossaryEntrySchema = z.object({
  id: kebab,
  term: z.string().min(1),
  kind: z.enum(GLOSSARY_KINDS),
  category: z.enum(GLOSSARY_CATEGORIES),
  variants: z.array(z.string().min(1)).default([]),
  short: z.string().min(1).max(320, 'short > 320 chars'),
  definition: z.string().min(1),
  concept: kebab.optional(),
  see: z.array(kebab).default([]),
  refs: z.array(z.number().int().positive()).default([]),
  sources: z.array(z.string()).default([]),
});
export const GlossarySchema = z.array(GlossaryEntrySchema);
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;

export const ConceptFrontmatterSchema = z.object({
  id: kebab,
  title: z.string().min(1),
  one_liner: z.string().min(1),
  why_here: z.string().min(1),
  prerequisites: z.array(kebab).default([]),
  terms: z.array(z.string()).default([]),
  figures: z.array(kebab).default([]),
  further_reading: z.array(z.object({ title: z.string().min(1), url: z.string().min(1), kind: z.string().optional() })).min(2, 'needs ≥2 further_reading'),
  self_check: z
    .array(z.object({ q: z.string().min(1), options: z.array(z.string()).min(2), answer: z.number().int(), explanation: z.string().default('') })
      .refine((q) => q.answer >= 0 && q.answer < q.options.length, { message: 'self_check answer index out of range' }))
    .min(1, 'needs ≥1 self_check'),
});
export type ConceptFrontmatter = z.infer<typeof ConceptFrontmatterSchema>;

const AxisSchema = z.object({ field: z.string(), label: z.string().optional(), unit: z.string().optional() });
export const FigureSchema = z.object({
  id: kebab,
  label: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(['chart', 'table', 'network']),
  synthesis: z.enum(['data', 'conceptual']),
  refs: z.array(z.number().int()).default([]),
  chart: z.object({ type: z.enum(['bar', 'grouped-bar']), x: AxisSchema, y: AxisSchema, series: z.string().optional() }).optional(),
  columns: z.array(z.object({ field: z.string(), label: z.string() })).optional(),
  data: z.string().min(1),
  caption: z.string().min(1),
  how_to_read: z.string().min(1),
  explain: z.array(z.object({ on: z.string().min(1), text: z.string().min(1), term: z.string().optional(), concept: kebab.optional() })).default([]),
  concepts: z.array(kebab).default([]),
  discussed_in: z.array(z.string()).default([]),
  source: z.string().min(1),
});
export const FiguresSchema = z.array(FigureSchema);
export type FigureDef = z.infer<typeof FigureSchema>;

export const REF_TIERS = ['seminal', 'classic', 'current', 'background'] as const;
export const ReferenceSchema = z
  .object({
    n: z.number().int().positive(),
    tier: z.enum(REF_TIERS),
    citation: z.string().min(1),
    title: z.string().min(1),
    publisher: z.string().min(1),
    published: z.union([z.string(), z.number()]).transform(String),
    url: z.string().min(1),
    year: z.number().int(),
    summary: z.string().default(''),
    why_it_mattered: z.string().default(''),
    role_here: z.enum(['support', 'data-source', 'background', 'guideline', 'method', 'contrast', 'prior-result', 'review', 'consensus']),
    role_note: z.string().default(''),
    cited_in: z.array(z.string()).default([]),
    verified: z.boolean(),
    read: z.enum(['full', 'partial']),
    accessed: z.string(),
    doc_type: z.string().min(1),
    register_code: z.string().default(''),
    item: z.string().default(''),
    url_status: z.enum(['moved', 'blocked', 'dead', 'ok']).optional(),
    newer_edition: z.object({ title: z.string(), published: z.union([z.string(), z.number()]).transform(String).optional(), url: z.string().optional(), note: z.string().optional() }).optional(),
    anchor: z.boolean().default(false),
  })
  .refine((r) => r.summary.trim().length > 0 || !r.verified, { message: 'no summary (allowed only with verified: false)' });
export const ReferencesSchema = z.array(ReferenceSchema);
export type Reference = z.infer<typeof ReferenceSchema>;

export const TodoSchema = z.array(z.object({ where: z.string().min(1), what: z.string().min(1) }));

export const ScopeSchema = z.object({
  topic: z.string(),
  question: z.string(),
  purpose: z.string(),
  boundary: z.object({ in: z.array(z.string()), out: z.array(z.string()), rationale: z.string() }),
  level: z.string(),
  time_window: z.record(z.union([z.string(), z.number()])),
  stance: z.string(),
  depth: z.string(),
  anchors: z.array(z.object({ citation: z.string(), why: z.string() })).default([]),
  excluded: z.array(z.object({ what: z.string(), why: z.string() })).default([]),
  assumed: z.boolean(),
  interview: z.array(z.object({ q: z.string(), answer: z.string(), asked: z.string() })),
  search_strategy: z.object({
    run_on: z.string(),
    sources: z.array(z.string()),
    queries: z.array(z.object({ q: z.string(), source: z.string(), hits: z.number(), kept: z.number() })),
    snowball: z.array(z.string()).default([]),
    inclusion: z.array(z.string()).default([]),
    exclusion: z.array(z.string()).default([]),
    known_gaps: z.array(z.string()).default([]),
  }),
  corpus_profile: z.object({
    by_tier: z.record(z.number()), year_range: z.tuple([z.number(), z.number()]), concentration: z.string(), dissent_represented: z.boolean(),
  }),
  verification: z.record(z.unknown()),
});
export type Scope = z.infer<typeof ScopeSchema>;

// ---------------------------------------------------------------------------------------- extensions (KICKOFF §4b–4g)
export const LEDGER_STATUSES = ['verified', 'corrected', 'updated', 'reattributed', 'newly-sourced', 'analysis', 'self', 'absence', 'removed', 'unverified'] as const;
export const LEDGER_KINDS = ['figure', 'event', 'status', 'description', 'role', 'absence', 'analysis', 'self'] as const;
export const LedgerEntrySchema = z.object({
  id: z.string().regex(/^B\d{4}(\+\d+)?\.([a-z]+|n\d+)$/, 'ledger id must be <block>.<letters> or <block>.n<k>'),
  block: blockId,
  section: kebab.nullable().transform((v) => v ?? ''),   // null on some removed entries whose block is gone
  kind: z.enum(LEDGER_KINDS),
  status: z.enum(LEDGER_STATUSES),
  quote: z.string(),
  anchor_ok: z.boolean(),
  original_claim: z.string().default(''),
  sources: z.array(z.object({ n: z.number().int().positive(), quote: z.string(), locator: z.string().default('') })).default([]),
  looked: z.string().default(''),
  note: z.string().default(''),
  checked: z.string(),
});
export const LedgerSchema = z.array(LedgerEntrySchema);
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const CHANGE_TYPES = ['correction', 'update', 'reattribution', 'new-source', 'softened', 'removed', 'wording'] as const;
export const CHANGE_PASSES = ['section-editor', 'consistency', 'editor-in-chief', 'read-through', 'spot-check', 'announcement-check'] as const;
export const ChangeSchema = z.object({
  id: z.string().regex(/^CH-\d{3,}$/),
  block: blockId,
  section: kebab,
  type: z.enum(CHANGE_TYPES),
  weight: z.enum(['substantive', 'minor']),
  old: z.string(),
  new: z.string(),
  reason: z.string().min(1),
  sources: z.array(z.number().int().positive()).default([]),
  claims: z.array(z.string()).default([]),
  pass: z.enum(CHANGE_PASSES),
  amends_revision: z.boolean(),
  needs_author: z.boolean(),
  decision: z.enum(['pending', 'accepted', 'rejected']),
});
export const ChangesSchema = z.array(ChangeSchema);
export type Change = z.infer<typeof ChangeSchema>;

export const OPEN_GROUPS = ['Could not be read', 'Could not be confirmed', 'Not published, as far as this review found', 'Waiting on a date', 'Editorial decision (not printed in Appendix D)'] as const;
export const OpenItemSchema = z.object({
  id: z.string().regex(/^OI-\d{2,}$/),
  group: z.enum(OPEN_GROUPS),
  what: z.string().min(1),
  why: z.string().min(1),
  blocks: z.array(blockId).default([]),
  sections: z.array(kebab).default([]),
  looked: z.array(z.string()).default([]),
  who: z.enum(['author', 'anyone-with-a-browser', 'next-review']),
  how_to_close: z.string().min(1),
});
export const OpenItemsSchema = z.array(OpenItemSchema);
export type OpenItem = z.infer<typeof OpenItemSchema>;

export const VerificationStatsSchema = z.object({
  claims_extracted: z.number(), claim_source_checks: z.number(), pass_a_verdicts: z.record(z.number()),
  register_entries: z.number(), documents_read_in_pass_a: z.number(), references: z.number(), ledger_entries: z.number(),
  ledger_by_status: z.record(z.number()), changes: z.number(), substantive_changes: z.number(), open_items: z.number(), words: z.number(),
});
export type VerificationStats = z.infer<typeof VerificationStatsSchema>;

export const LAYER_GROUPS = ['People and place', 'Health and community', 'Workforce and shortage', 'Deaths', 'Coverage', 'Coverage policy', 'National rankings', 'Spending'] as const;
export const LayerSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  unit: z.string().min(1),
  geography: z.array(z.enum(['county', 'state'])).min(1),
  definition: z.string().min(1),
  higher_is: z.enum(['better', 'worse', 'neutral']),
  source_title: z.string().min(1),
  publisher: z.string().min(1),
  vintage: z.string().min(1),
  url: z.string().min(1),
  data_url: z.string().default(''),
  retrieved: isoDate,
  retrieval: z.string().min(1),
  suppressed_note: z.string().default(''),
  caveats: z.string().default(''),
  ref: z.number().int().positive(),
  group: z.enum(LAYER_GROUPS),
});
export const LayersSchema = z.array(LayerSchema);
export type Layer = z.infer<typeof LayerSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().regex(/^(d[1-8]|s(9|1[0-2]))$/), label: z.string(), title: z.string(), kind: z.enum(['domain', 'cross-sector']),
  number: z.number().int(), section: kebab, scope: z.string(), admh_plan_goals: z.array(z.string()).default([]),
});
export const GraphEdgeSchema = z.object({
  id: z.string(), from: z.string(), to: z.string(), row: z.number().int(), pair: z.string(), link: z.string(), evidence: z.string(),
  refs: z.array(z.number().int()), block: blockId,
});
export const SystemsGraphSchema = z.object({ nodes: z.array(GraphNodeSchema).length(12), edges: z.array(GraphEdgeSchema).min(1), reading: z.string().min(1) });
export type SystemsGraph = z.infer<typeof SystemsGraphSchema>;

export const IndicatorsSchema = z.object({
  headline: z.array(z.object({
    label: z.string(), alabama: z.string(), united_states: z.string(), rank_of_51: z.string(), note: z.string(),
    refs: z.array(z.number().int()), nodes: z.array(z.string()).min(1).max(2), block: blockId,
  })),
  all_figures_by_node: z.record(z.array(z.object({
    claim: z.string(), text: z.string(), status: z.enum(LEDGER_STATUSES), refs: z.array(z.number().int()), section: kebab, block: blockId,
  }))),
  map_layers_by_node: z.record(z.array(z.string())),
});
export type Indicators = z.infer<typeof IndicatorsSchema>;

/** Format a zod error as one line per issue. */
export function zodLines(file: string, err: z.ZodError): string[] {
  return err.issues.map((i) => `${file}: ${i.path.join('.') || '(root)'}: ${i.message}`);
}
