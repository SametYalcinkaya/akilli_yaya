const endpoints = {
    start: "/api/start",
    stop: "/api/stop",
    reset: "/api/reset",
};

async function callEndpoint(path) {
    try {
        await fetch(path, { method: "POST" });
    } catch (error) {
        console.error("API call failed", error);
    }
}

export function ControlPanel() {
    return (
        <div className="flex gap-2">
            <button
                onClick={() => callEndpoint(endpoints.start)}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-900/30"
            >
                Başlat
            </button>
            <button
                onClick={() => callEndpoint(endpoints.stop)}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950 shadow-md shadow-amber-900/30"
            >
                Durdur
            </button>
            <button
                onClick={() => callEndpoint(endpoints.reset)}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 shadow-md shadow-slate-900/30"
            >
                Reset
            </button>
        </div>
    );
}
