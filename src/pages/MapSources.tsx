import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { D, useData } from '@/lib/data';

const Markdown = lazy(() => import('@/components/Markdown'));

/** /map/sources — the data dictionary (KICKOFF §4d): all layers, NOTES.md as written, the raw files and checks. */
export default function MapSources() {
  const layers = useData(D.layers);
  const methods = useData(D.methods);
  const base = import.meta.env.BASE_URL;
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Map sources</h1>
      <p className="mt-2 max-w-3xl text-[15px]">Every map layer, where it came from and what to watch for. Values are shown exactly as published; the only computations on the maps are the quantile class breaks and an area's position in the ordered list, each labelled where it appears.</p>
      {!layers ? <p className="bx-muted mt-6" role="status">Loading…</p> : (
        <div className="overflow-x-auto mt-6">
          <table className="w-full text-sm border-collapse" data-testid="layers-table">
            <caption className="text-left font-semibold mb-1">All {layers.length} layers</caption>
            <thead><tr className="bx-th text-left">{['Layer', 'Geography', 'Unit', 'Source', 'Vintage', 'Caveats'].map((h) => <th key={h} className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}>{h}</th>)}</tr></thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="align-top">
                  <td className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}><span className="font-semibold">{l.label}</span><span className="block text-xs bx-muted font-mono">{l.id}</span>
                    <span className="block text-xs">{l.geography.includes('county') && l.picker && <Link to={`/map/alabama?layer=${l.id}`}>Alabama map</Link>}{l.geography.length > 1 && l.picker && ' · '}{l.geography.includes('state') && l.picker && <Link to={`/map/us?layer=${l.id}`}>US map</Link>}{!l.picker && 'shown in the tooltip of the expansion-status layer'}</span></td>
                  <td className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}>{l.geography.join(', ')}<span className="block text-xs bx-muted">{l.group}</span></td>
                  <td className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}>{l.unit}</td>
                  <td className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}><a href={l.url} target="_blank" rel="noreferrer">{l.source_title}</a><span className="block text-xs">{l.publisher} <button type="button" className="bx-cite" data-cite={l.ref} aria-label={`Source ${l.ref}`}>[{l.ref}]</button></span></td>
                  <td className="p-2 border" style={{ borderColor: 'var(--bx-line-soft)' }}>{l.vintage}<span className="block text-xs bx-muted">retrieved {l.retrieved}</span></td>
                  <td className="p-2 border text-xs leading-5" style={{ borderColor: 'var(--bx-line-soft)' }}>{l.caveats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <section className="mt-10 max-w-4xl" aria-labelledby="files-h">
        <h2 id="files-h" className="text-2xl">The files</h2>
        <p className="mt-2 text-[15px]">The two tables the maps draw on, the layer definitions and the overlay file, and every raw file as retrieved, with the checks that matched each retrieval against the publisher's data (<a href={`${base}data/geo/raw/checks.md`}>checks.md</a>).</p>
        <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
          {['al_counties.csv', 'us_states.csv', 'layers.json', 'overlays.json', 'NOTES.md'].map((f) => <li key={f}><a href={`${base}data/geo/${f}`} download>{f}</a></li>)}
        </ul>
        <h3 className="text-lg mt-4">Raw files</h3>
        <ul className="mt-1 grid gap-1 text-sm sm:grid-cols-2" data-testid="raw-files">
          {(methods?.rawFiles ?? []).map((f) => <li key={f.name}><a href={`${base}data/geo/raw/${f.name}`} download>{f.name}</a> <span className="bx-muted text-xs">{(f.bytes / 1024).toFixed(1)} KB</span></li>)}
        </ul>
      </section>
      <section className="mt-10 max-w-4xl" aria-labelledby="notes-h">
        <h2 id="notes-h" className="text-2xl">Notes on the map data, as written</h2>
        <div className="mt-3 bx-prose text-[15px] [&_h1]:text-2xl [&_h2]:text-xl [&_h2]:mt-6 [&_h3]:mt-4 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_table]:text-sm [&_td]:border [&_th]:border [&_td]:p-1.5 [&_th]:p-1.5 [&_code]:font-mono [&_code]:text-[13px] overflow-x-auto">
          {methods ? <Suspense fallback={<p className="bx-muted">Loading…</p>}><Markdown md={methods.geoNotes} /></Suspense> : <p className="bx-muted" role="status">Loading…</p>}
        </div>
      </section>
    </div>
  );
}
