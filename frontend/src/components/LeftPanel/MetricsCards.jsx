import { Users, AlertTriangle, Clock, MapPin } from "lucide-react";

function MetricCard({ title, value, accent = "text-emerald-300", icon: Icon, colorClass = "bg-emerald-500/10 border-emerald-500/20" }) {
    return (
        <div className={`glass-card rounded-xl p-4 border ${colorClass} flex flex-col justify-between h-24`}>
            <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{title}</p>
                {Icon && <Icon size={16} className="text-slate-500" />}
            </div>
            <p className={`text-2xl font-bold tracking-tight ${accent}`}>{value}</p>
        </div>
    );
}

export function MetricsCards({ metrics }) {
    const detectedCount = metrics?.summary?.total ?? 0;
    const criticalId = metrics?.traffic?.criticalPedestrianId;
    const extension = metrics?.traffic?.extensionTime ?? 0;
    const avgSpeed = metrics?.summary?.avgSpeed ? metrics.summary.avgSpeed.toFixed(1) : "0.0";

    return (
        <div className="grid grid-cols-2 gap-3">
            <MetricCard 
                title="Toplam Yaya" 
                value={detectedCount} 
                icon={Users}
                accent="text-emerald-400"
                colorClass="bg-emerald-500/5 border-emerald-500/10 hover:bg-emerald-500/10"
            />
            <MetricCard 
                title="Kritik Yaya ID" 
                value={criticalId ? `#${criticalId}` : "-"} 
                icon={AlertTriangle}
                accent="text-amber-400" 
                colorClass="bg-amber-500/5 border-amber-500/10 hover:bg-amber-500/10"
            />
            <MetricCard 
                title="Ek Süre" 
                value={`+${extension}s`} 
                icon={Clock}
                accent="text-blue-400" 
                colorClass="bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/10"
            />
            <MetricCard 
                title="Ort. Hız" 
                value={`${avgSpeed} m/s`} 
                icon={MapPin}
                accent="text-purple-400" 
                colorClass="bg-purple-500/5 border-purple-500/10 hover:bg-purple-500/10"
            />
        </div>
    );
}
