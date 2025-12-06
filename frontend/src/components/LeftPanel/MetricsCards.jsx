function MetricCard({ title, value, accent = "text-emerald-300" }) {
    return (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 shadow-lg shadow-emerald-900/10">
            <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
            <p className={`text-2xl font-semibold ${accent}`}>{value}</p>
        </div>
    );
}

export function MetricsCards({ metrics }) {
    const detectedCount = metrics?.detections ?? 0;
    const critical = metrics?.critical_person?.category || "-";
    const extension = metrics?.extension_time ?? 0;
    const position = metrics?.critical_person?.position_percent
        ? Math.round(metrics.critical_person.position_percent * 100)
        : 0;

    return (
        <div className="grid grid-cols-2 gap-3">
            <MetricCard title="Tespit Edilen" value={detectedCount} />
            <MetricCard title="Kritik" value={critical} accent="text-amber-300" />
            <MetricCard title="Ek Süre" value={`+${extension}s`} accent="text-emerald-300" />
            <MetricCard title="Konum" value={`%${position}`} accent="text-sky-300" />
        </div>
    );
}
