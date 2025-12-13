import { TrafficLight } from "./TrafficLight.jsx";

const defaultState = {
    north: { vehicle_light: "green", pedestrian_light: "red", countdown: 10 },
    south: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
    east: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
    west: { vehicle_light: "red", pedestrian_light: "green", countdown: 10 },
};

function isActive(directionData) {
    return directionData?.vehicle_light === "green";
}

export function IntersectionMap({ state = defaultState, cycleDuration }) {
    const mapState = state?.state || state || defaultState;
    const effectiveCycle = cycleDuration ?? state?.cycle_duration ?? 15;
    const entries = Object.entries(mapState);
    return (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-emerald-900/10">
            {entries.map(([direction, data]) => (
                <div
                    key={direction}
                    className={`rounded-lg border p-3 transition-all ${isActive(data)
                        ? "border-emerald-500/60 bg-emerald-500/10 shadow-lg shadow-emerald-900/30"
                        : "border-slate-800 bg-slate-900/80"
                        }`}
                >
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-slate-400">
                        <span>{direction}</span>
                        <span className={isActive(data) ? "text-emerald-300" : "text-slate-300"}>
                            {Math.max(0, Math.round(data.countdown || 0))}s
                        </span>
                    </div>
                    <div className="mt-2">
                        <TrafficLight
                            vehicle={data.vehicle_light}
                            pedestrian={data.pedestrian_light}
                        />
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-slate-800/80">
                        {(() => {
                            const countdown = Math.max(0, data?.countdown ?? 0);
                            const baseline = Math.max(1, effectiveCycle);
                            const ratio = Math.min(1, countdown / baseline);
                            return (
                                <div
                                    className={`h-2 rounded-full transition-all ${isActive(data)
                                        ? "bg-emerald-400"
                                        : "bg-slate-600"
                                        } ${countdown <= 3 && isActive(data) ? "animate-pulse" : ""}`}
                                    style={{ width: `${(ratio * 100).toFixed(1)}%` }}
                                />
                            );
                        })()}
                    </div>
                </div>
            ))}
        </div>
    );
}
