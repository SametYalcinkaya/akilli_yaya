export function VideoDisplay({ detections = [], status }) {
    return (
        <div className="relative h-[360px] w-full overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800">
            <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                Canlı akış henüz bağlı değil
            </div>
            {detections.map((det, idx) => (
                <div
                    key={`${det.track_id || det.id || idx}`}
                    className="absolute rounded border border-emerald-400/70 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100"
                    style={{
                        left: `${10 + idx * 6}%`,
                        top: `${15 + idx * 4}%`,
                    }}
                >
                    {det.category || "adult"} · {(det.score || 0).toFixed(2)}
                </div>
            ))}
            <div className="absolute left-4 top-4 text-xs uppercase tracking-widest text-slate-400">
                Video Feed · {status}
            </div>
        </div>
    );
}
