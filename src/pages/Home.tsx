import { Link } from 'react-router-dom';
import { AS_OF_TEXT, conceptsIndex, counts, layersBrief, manifest, stats } from '@/lib/data';
import { Logo } from '@/components/Layout';

const fmt = (n: number) => n.toLocaleString('en-US');

/** The front door (KICKOFF §4): mark, title, draft status in words, abstract, as_of, five entry cards, the primers. */
export default function Home() {
  const stateLayers = layersBrief.filter((l) => l.geography.includes('state')).length;
  const cards = [
    { to: '/read', title: 'Read the report', text: 'The October 2026 draft, with the source of every sentence one hover away: a summary of the source and the passage that supports the sentence.', nums: `${fmt(stats.words)} words · ${fmt(counts.references)} sources · ${fmt(stats.ledger_entries)} claims checked` },
    { to: '/changes', title: 'See what the check changed', text: 'Every change the source check made to the text, with its reason, and what it could not settle.', nums: `${fmt(stats.changes)} changes logged · ${fmt(stats.substantive_changes)} substantive · ${fmt(stats.open_items)} open items`, extra: { to: '/open-items', label: 'Open items' } },
    { to: '/map/alabama', title: 'Explore Alabama on a map', text: "Alabama's counties on public data, with the Department of Mental Health's own service areas; every value with its source and year.", nums: `${fmt(counts.layers)} layers · ${fmt(counts.counties)} counties` },
    { to: '/systems', title: 'Explore the system as a graph', text: "The report's eight domains and four cross-sector sections, the dependencies it draws between them, and the Alabama figures behind each.", nums: `${fmt(counts.rows)} dependencies · ${fmt(counts.nodes)} parts of the system` },
    { to: '/map/us', title: 'Compare Alabama with the other states', text: 'A US map built from the same kinds of data, with Alabama outlined and beside every state.', nums: `${fmt(counts.states)} states and DC · ${fmt(stateLayers)} state layers` },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Logo height={72} />
      <h1 className="mt-6 text-4xl sm:text-5xl leading-tight">{manifest.title}</h1>
      <p className="mt-2 text-xl bx-muted">{manifest.subtitle}</p>
      <p className="mt-4 text-[15px] font-semibold" data-testid="venue">{manifest.venue}</p>
      <p className="mt-1 flex flex-wrap gap-2 items-center text-sm">
        <span className="bx-asof" data-testid="as-of">Current as of {AS_OF_TEXT}</span>
        <span className="bx-chip-line">Version {manifest.report.version}</span>
        <span className="bx-chip-line">by {manifest.authors.join(', ')}</span>
      </p>
      <p className="bx-prose mt-6 max-w-3xl text-[17px] leading-8">{manifest.plain_abstract}</p>
      <p className="mt-6"><Link to="/read" className="bx-btn-primary !text-base !px-4 !py-2 no-underline">Start reading <span aria-hidden="true">→</span></Link></p>

      <h2 className="mt-12 text-2xl">Five ways in</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.to} className="bx-card p-4 flex flex-col">
            <h3 className="text-lg" style={{ color: 'var(--bx-head)' }}><Link to={c.to} className="no-underline hover:underline" style={{ color: 'inherit' }}>{c.title}</Link></h3>
            <p className="mt-1 text-[15px] leading-6 flex-1">{c.text}</p>
            <p className="mt-3 text-sm font-semibold" data-testid="card-numbers">{c.nums}</p>
            {c.extra && <p className="mt-1 text-sm"><Link to={c.extra.to}>{c.extra.label} →</Link></p>}
          </li>
        ))}
      </ul>

      <h2 className="mt-12 text-2xl">Start with a primer</h2>
      <p className="bx-muted mt-1 text-[15px]">Twelve short introductions to the ideas the report assumes, each with a self-check.</p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {conceptsIndex.map((c) => (
          <li key={c.id} className="bx-card p-3">
            <Link to={`/concepts/${c.id}`} className="font-bold">{c.title}</Link>
            <p className="text-sm mt-0.5">{c.one_liner}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
