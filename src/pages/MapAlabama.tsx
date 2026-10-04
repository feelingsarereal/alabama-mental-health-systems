import { Link } from 'react-router-dom';
import { D, useData } from '@/lib/data';
import MapView from '@/components/maps/MapView';

export default function MapAlabama() {
  const layers = useData(D.layers);
  const map = useData(D.mapAl);
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Alabama's counties</h1>
      <p className="mt-2 max-w-3xl text-[15px]">Choose a layer to colour the 67 counties; hover or focus a county for its value and source, click it for every layer, and switch on the Department of Mental Health's own service areas. Every value is as its publisher released it; see <Link to="/map/sources">the map sources</Link>.</p>
      <div className="mt-6">{!layers || !map ? <p className="bx-muted" role="status">Loading the map…</p> : <MapView geo="al" layers={layers} map={map} defaultLayer="pct_poverty" />}</div>
    </div>
  );
}
