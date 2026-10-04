import { Link } from 'react-router-dom';
import { D, useData } from '@/lib/data';
import MapView from '@/components/maps/MapView';

export default function MapUs() {
  const layers = useData(D.layers);
  const map = useData(D.mapUs);
  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8">
      <h1 className="text-3xl sm:text-4xl">Alabama and the other states</h1>
      <p className="mt-2 max-w-3xl text-[15px]">The 50 states and the District of Columbia on the same kinds of data, with Alabama outlined in orange. Click a state to see every layer for it beside Alabama's value. Sources: <Link to="/map/sources">the map sources</Link>.</p>
      <div className="mt-6">{!layers || !map ? <p className="bx-muted" role="status">Loading the map…</p> : <MapView geo="us" layers={layers} map={map} defaultLayer="mha_overall_rank" />}</div>
    </div>
  );
}
