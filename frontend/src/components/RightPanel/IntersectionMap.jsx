import { TrafficLight } from "./TrafficLight.jsx";

const defaultState = {
    north: { vehicle_light: "green", pedestrian_light: "red", countdown: 10 },
    south: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
    east: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
    west: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
};

export function IntersectionMap({ state = defaultState }) {
    const entries = Object.entries(state);
    return (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-emerald-900/10">
            {entries.map(([direction, data]) => (
                <div key={direction} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        <span>{direction}</span>
                        <span className="text-emerald-300">{data.countdown || 0}s</span>
                    </div>
                    <div className="mt-2">
                        <TrafficLight
                            vehicle={data.vehicle_light}
                            pedestrian={data.pedestrian_light}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}
