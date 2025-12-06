function Light({ active, color }) {
    return (
        <div
            className={`h-4 w-4 rounded-full border border-slate-600 ${active ? color : "bg-slate-800"
                }`}
        />
    );
}

export function TrafficLight({ vehicle = "red", pedestrian = "green" }) {
    return (
        <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <div className="flex items-center gap-1">
                <Light active={vehicle === "red"} color="bg-red-500" />
                <Light active={vehicle === "yellow"} color="bg-amber-400" />
                <Light active={vehicle === "green"} color="bg-emerald-400" />
            </div>
            <div className="flex items-center gap-1">
                <Light active={pedestrian === "red"} color="bg-red-400" />
                <Light active={pedestrian === "green"} color="bg-emerald-400" />
            </div>
        </div>
    );
}
