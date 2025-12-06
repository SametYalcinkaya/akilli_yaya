import { useMemo } from "react";
import { ControlPanel } from "./components/LeftPanel/ControlPanel.jsx";
import { MetricsCards } from "./components/LeftPanel/MetricsCards.jsx";
import { VideoDisplay } from "./components/LeftPanel/VideoDisplay.jsx";
import { IntersectionMap } from "./components/RightPanel/IntersectionMap.jsx";
import { StatusBadge } from "./components/shared/StatusBadge.jsx";
import { useWebSocket } from "./hooks/useWebSocket.js";

const WS_BASE = import.meta.env.VITE_BACKEND_WS || "ws://localhost:8000";

export default function App() {
    const videoSocket = useWebSocket(`${WS_BASE}/ws/video-stream`);
    const trafficSocket = useWebSocket(`${WS_BASE}/ws/traffic-state`);

    const metrics = useMemo(() => {
        const data = videoSocket.data || {};
        return {
            detections: data?.detections?.length ?? 0,
            extension_time: data?.metrics?.extension_time ?? 0,
            critical_person: data?.metrics?.critical_person,
        };
    }, [videoSocket.data]);

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-6">
            <header className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-emerald-300">MVP 1.0</p>
                    <h1 className="text-2xl font-bold text-slate-50">Akıllı Yaya Güvenliği Paneli</h1>
                    <p className="text-sm text-slate-400">YOLOv8 + gerçek zamanlı süre uyarlama</p>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge status={videoSocket.status} />
                    <StatusBadge status={trafficSocket.status} />
                </div>
            </header>

            <main className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                <section className="lg:col-span-3 space-y-4">
                    <VideoDisplay
                        detections={videoSocket.data?.detections || []}
                        status={videoSocket.status}
                        frame={videoSocket.data?.frame}
                    />
                    <MetricsCards metrics={metrics} />
                    <ControlPanel />
                </section>

                <section className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-200">Trafik Simülasyonu</p>
                        <span className="text-xs text-slate-400">Senkronizasyon</span>
                    </div>
                    <IntersectionMap state={trafficSocket.data || undefined} />
                </section>
            </main>
        </div>
    );
}
