import { Link } from 'react-router-dom';
import { D, blockHref, sectionTitle, useData, AS_OF_TEXT } from '@/lib/data';

const n = (x: number | undefined) => (x ?? 0).toLocaleString('en-US');
const STATUS_WORDS: Record<string, string> = {
  verified: 'verified as written', corrected: 'corrected', updated: 'updated to a newer figure or event', reattributed: 'moved to the source that carries it',
  'newly-sourced': 'given a source it lacked', analysis: "the report's own analysis", self: "the report's statements about itself", absence: 'dated "not found" findings',
  removed: 'removed', unverified: 'kept without a source',
};
const VERDICT_WORDS: Record<string, string> = {
  confirmed: 'confirmed by the cited source', confirmed_by_derivation: 'confirmed by arithmetic on the cited figures', partly: 'partly supported', not_in_cited_source: 'not in the cited source',
  outdated: 'outdated', contradicted: 'contradicted', not_checked: 'not checked',
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return <section id={id} className="mt-10 scroll-mt-40" aria-labelledby={`${id}-h`}><h2 id={`${id}-h`} className="text-2xl">{title}</h2><div className="mt-2 bx-prose grid gap-2">{children}</div></section>;
}

export default function Methods() {
  const m = useData(D.methods);
  if (!m) return <div className="mx-auto max-w-4xl px-4 py-8"><h1 className="text-3xl sm:text-4xl">Methods</h1><p className="bx-muted mt-4" role="status">Loading…</p></div>;
  const s = m.scope; const v = m.verificationStats; const p = m.provenance;
  const todoGroups = new Map<string, { where: string; what: string }[]>();
  for (const t of m.todo) { const k = t.where.split('/')[0]; if (!todoGroups.has(k)) todoGroups.set(k, []); todoGroups.get(k)!.push(t); }
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Methods and provenance</h1>
      <p className="bx-prose mt-3 font-semibold">This is a scope-bounded check of one report against its own sources, not a systematic review.</p>
      <p className="bx-prose mt-2">The report's text is Little Orange Fish's, as revised on {AS_OF_TEXT}; this site renders it as written. The source summaries, glossary, primers, change log, open items and map data were prepared with Claude for this site. Everything here comes from the content pack; where the pack has a gap, it is listed below rather than filled.</p>
      <nav aria-label="On this page" className="mt-4 text-sm flex flex-wrap gap-x-4 gap-y-1">
        {[['scope', 'Scope'], ['interview', 'Interview'], ['strategy', 'How sources were found'], ['check', 'The check'], ['partial', 'Read in part'], ['corpus', 'Corpus'], ['analysis', 'Analysis passages'], ['coverage', 'Coverage counts'], ['unanchored', 'Unanchored claims'], ['todo', 'TODO(author)'], ['errors', 'Build errors']].map(([id, t]) => <a key={id} href={`#${id}`}>{t}</a>)}
      </nav>

      <Section id="scope" title="Scope">
        <p><strong>The question:</strong> {s.question}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><h3 className="text-lg">In scope</h3><ul className="list-disc pl-5">{s.boundary.in.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="text-lg">Out of scope</h3><ul className="list-disc pl-5">{s.boundary.out.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
        <p><strong>Why:</strong> {s.boundary.rationale}</p>
        {s.excluded.length > 0 && <><h3 className="text-lg">Left out, with reasons</h3><ul className="list-disc pl-5">{s.excluded.map((x) => <li key={x.what}><strong>{x.what}</strong> — {x.why}</li>)}</ul></>}
        <p className="text-sm">Level: {s.level} · stance: {s.stance} · depth: {s.depth}</p>
        <details><summary className="cursor-pointer">The request as the author wrote it</summary><p className="mt-1 italic">{s.topic}</p></details>
      </Section>

      <Section id="interview" title="The interview, as asked and answered">
        <dl className="grid gap-2">{s.interview.map((x, i) => <div key={i} className="bx-card p-3"><dt className="font-semibold">{x.q}</dt><dd>{x.answer} <span className="bx-muted text-sm">({x.asked})</span></dd></div>)}</dl>
      </Section>

      <Section id="strategy" title="How sources were found">
        <p>Run on {s.search_strategy.run_on}. Sources: {s.search_strategy.sources.join('; ')}.</p>
        <p className="bx-panel p-3 text-[15px]">The rows below are <strong>counts of documents and checks, not search strings</strong>: individual search strings were not logged. They are shown as the pack records them.</p>
        <div className="overflow-x-auto"><table className="w-full text-sm border-collapse">
          <thead><tr className="bx-th text-left"><th className="p-2">What was done</th><th className="p-2">How</th><th className="p-2">Count</th><th className="p-2">Kept</th></tr></thead>
          <tbody>{s.search_strategy.queries.map((q, i) => <tr key={i} className="border-t align-top" style={{ borderColor: 'var(--bx-line-soft)' }}><td className="p-2">{q.q}</td><td className="p-2">{q.source}</td><td className="p-2">{n(q.hits)}</td><td className="p-2">{n(q.kept)}</td></tr>)}</tbody>
        </table></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><h3 className="text-lg">Included</h3><ul className="list-disc pl-5">{s.search_strategy.inclusion.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3 className="text-lg">Excluded</h3><ul className="list-disc pl-5">{s.search_strategy.exclusion.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
        <h3 className="text-lg">Followed from each source</h3><ul className="list-disc pl-5">{s.search_strategy.snowball.map((x) => <li key={x}>{x}</li>)}</ul>
        <h3 className="text-lg">Known gaps</h3><ul className="list-disc pl-5">{s.search_strategy.known_gaps.map((x) => <li key={x}>{x}</li>)}</ul>
      </Section>

      <Section id="check" title="The check, in plain numbers">
        <p>The 3 October 2026 draft was split into <strong>{n(v.claims_extracted)}</strong> individual claims. Every document in the report's {n(v.register_entries)}-entry source register was opened ({n(v.documents_read_in_pass_a)} documents once bundles were split), and each claim was judged against each source it cited: <strong>{n(v.claim_source_checks)}</strong> claim-by-source checks.</p>
        <ul className="list-disc pl-5">{Object.entries(v.pass_a_verdicts).map(([k, x]) => <li key={k}>{n(x)} {VERDICT_WORDS[k] ?? k}</li>)}</ul>
        <p>The revised text carries a ledger of <strong>{n(v.ledger_entries)}</strong> entries, one per claim it now makes:</p>
        <ul className="list-disc pl-5">{Object.entries(v.ledger_by_status).sort((a, b) => b[1] - a[1]).map(([k, x]) => <li key={k}>{n(x)} {STATUS_WORDS[k] ?? k}</li>)}</ul>
        <p>The revision logged <Link to="/changes?weight=all">{n(v.changes)} changes</Link>, {n(v.substantive_changes)} of them substantive, and left <Link to="/open-items">{n(v.open_items)} open items</Link>.</p>
        <p className="bx-panel p-3 text-[15px]">Sources were read through an automated reader that returns extracts. The quoted supporting passages are as the reader returned them, and page numbers are approximate.</p>
      </Section>

      <Section id="partial" title="What “read in part” means">
        <p>A source marked <em>read in part</em> could not be read in full: the reader truncated it, or only some pages could be reached. The claims that rest on it were checked against what could be read. <strong>{n(p.references?.by_read?.partial)}</strong> of {n(p.references?.total)} references were read in part. <Link to="/references?read=partial">See them →</Link></p>
      </Section>

      <Section id="corpus" title="The corpus">
        <p>{Object.entries(s.corpus_profile.by_tier).map(([k, x]) => `${n(x)} ${k}`).join(' · ')}; published {s.corpus_profile.year_range[0]}–{s.corpus_profile.year_range[1]}.</p>
        <p>{s.corpus_profile.concentration}</p>
        <p>Dissent represented: {s.corpus_profile.dissent_represented ? 'yes' : 'no'}.</p>
        <p className="text-sm">{n(p.references?.with_newer_edition?.length)} references have a newer edition, named on their cards; {n(p.references?.ledger_only?.length)} {p.references?.ledger_only?.length === 1 ? 'is' : 'are'} cited only in the claims ledger; {n(p.references?.maps_glossary_primers_only?.length)} are cited only by the maps, glossary or primers.</p>
      </Section>

      <Section id="analysis" title={`Every analysis passage (${m.synthesis.length})`}>
        <p>Passages marked <em>analysis</em> are the report's own reading of the evidence — chiefly its “Gaps and opportunities” — and are marked in the reader with a quiet rule. {n(m.framing)} further passages are marked as framing (transitions and the report's statements about itself), which carry no claim of fact.</p>
        <ol className="grid gap-1 text-sm list-decimal pl-6">{m.synthesis.map((x) => <li key={x.id}><Link to={`/read#${x.id}`}>{sectionTitle(x.section)} · {x.block}</Link> — <span className="bx-muted">{x.excerpt}</span></li>)}</ol>
      </Section>

      <Section id="coverage" title="Coverage counts">
        <ul className="list-disc pl-5 text-[15px]">
          <li>{n(p.blocks?.total)} blocks of text ({n(p.blocks?.cited)} cited, {n(p.blocks?.framing)} framing, {n(p.blocks?.synthesis)} analysis); {n(p.blocks?.uncited)} uncited blocks of 25 words or more.</li>
          <li>{n(p.ledger?.anchored)} of {n(p.ledger?.entries)} ledger entries anchored in the text; {n(p.ledger?.removed)} removed claims are not anchored by design.</li>
          <li>Glossary: {n(p.terms?.linked)} of {n(p.terms?.occurring_in_text)} terms that occur in the text are linked ({p.terms?.linked_pct}%).{p.terms?.not_in_text?.length ? ` Not found in the text: ${p.terms.not_in_text.join(', ')}.` : ''}</li>
          <li>{n(p.references?.with_summary)} of {n(p.references?.total)} references have a summary; {n(p.references?.unverified_but_cited)} unverified references are cited.</li>
          <li>Figures: {Object.entries(p.figures?.by_synthesis ?? {}).map(([k, x]) => `${x} ${k === 'data' ? 'synthesised from data' : 'conceptual'}`).join(', ')}.</li>
          <li>Maps: {n(p.maps?.layers)} layers over {n(p.maps?.counties)} counties and {n(p.maps?.states)} states and DC; {n(p.maps?.raw_files)} raw files; <Link to="/map/sources">map sources →</Link></li>
          <li>Systems graph: {n(p.systems?.nodes)} parts, {n(p.systems?.edges)} drawn links from {n(p.systems?.rows)} rows of the report's dependency table.</li>
        </ul>
        <p className="text-sm">The full counts are in <a href={`${import.meta.env.BASE_URL}provenance.json`}>provenance.json</a>.</p>
      </Section>

      <Section id="unanchored" title="Claims the reader cannot underline">
        <p>Ledger entries marked <code>anchor_ok: false</code> by the check, so not anchored to a sentence:</p>
        <ul className="grid gap-1.5 text-sm">{m.unanchoredByDesign.map((u) => <li key={u.id} className="bx-card p-2"><span className="font-mono font-semibold">{u.id}</span> · {u.status} · {u.block_exists ? <Link to={blockHref(u.block)}>{u.block}</Link> : <span className="bx-todo">block {u.block} is not in the text</span>}<p className="mt-0.5">“{u.quote}”</p>{u.note && <p className="bx-muted mt-0.5">{u.note}</p>}</li>)}</ul>
        {m.anchorErrors.length > 0 && (<><p className="mt-2">Entries whose anchor failed in this build (a build error, not re-pointed):</p>
          <ul className="grid gap-1.5 text-sm">{m.anchorErrors.map((u) => <li key={u.id} className="bx-card p-2 border-l-4" style={{ borderLeftColor: 'var(--bx-amber)' }}><span className="font-mono font-semibold">{u.id}</span> · <Link to={blockHref(u.block)}>{u.block}</Link> · {u.reason}<p className="mt-0.5">“{u.quote}”</p></li>)}</ul></>)}
      </Section>

      <Section id="todo" title={`TODO(author) — ${m.todo.length} gaps the pack records`}>
        {[...todoGroups.entries()].map(([k, xs]) => (
          <details key={k} open={k !== 'references'}><summary className="cursor-pointer font-semibold">{k === 'open-items' ? 'Open items' : k === 'references' ? 'References' : k} ({xs.length})</summary>
            <ul className="mt-1 grid gap-1 text-sm">{xs.map((t, i) => {
              const id = t.where.split('/')[1];
              const to = k === 'open-items' ? `/open-items#${id}` : k === 'references' ? `/references#ref-${id}` : null;
              return <li key={i}><span className="bx-todo mr-1">TODO(author)</span>{to ? <Link to={to} className="font-mono">{t.where}</Link> : <span className="font-mono">{t.where}</span>} — {t.what}</li>;
            })}</ul>
          </details>
        ))}
      </Section>

      <Section id="errors" title={`Build errors (${m.errors.length})`}>
        {m.errors.length === 0 ? <p>None: the content pack built without errors.</p> : (
          <>
            <p>The content build lists these and writes them to <code>content-pack/BUILD-ERRORS.md</code>. Each needs a decision in the pack; the site was built from everything that validated.</p>
            <ul className="grid gap-1 text-sm">{m.errors.map((e, i) => <li key={i} className="bx-card p-2 border-l-4 break-words" style={{ borderLeftColor: 'var(--bx-amber)' }}>{e}</li>)}</ul>
          </>
        )}
        {m.warnings.length > 0 && <details><summary className="cursor-pointer">Warnings ({m.warnings.length})</summary><ul className="text-sm list-disc pl-5">{m.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul></details>}
      </Section>
    </div>
  );
}
