import { useEffect, useRef, useState, useCallback } from "react";
import { Activity, Signal, Wifi, WifiOff, MapPin, Play, Square, Video, AlertTriangle, Users, Clock, Zap } from "lucide-react";
import { VideoDisplay } from "./components/LeftPanel/VideoDisplay";
import { MetricsCards } from "./components/LeftPanel/MetricsCards";
import { ControlPanel } from "./components/LeftPanel/ControlPanel";

// ==================== Bursa Kavşak Kameraları ====================
const BURSA_KAVSAK_KAMERALARI = [
    { id: 1, name: "Polis Okulu Kavşağı", url: "https://player.bursa.bel.tr/?stream=polisokulu_720p" },
];

const CATEGORIES = {
    adult: { name: "Yetişkin", emoji: "🚶", color: "#3b82f6", bgColor: "bg-blue-500" },
    elderly: { name: "Yaşlı", emoji: "👴", color: "#a855f7", bgColor: "bg-purple-500" },
    child: { name: "Çocuk", emoji: "👶", color: "#ef4444", bgColor: "bg-red-500" },
    disabled: { name: "Engelli", emoji: "♿", color: "#f59e0b", bgColor: "bg-amber-500" },
};

const WS_URL = "ws://localhost:8001/ws/video-stream";
const API_URL = "http://localhost:8001/api";

export default function App() {
    // State
    const [wsStatus, setWsStatus] = useState("disconnected");
    const [streamSources, setStreamSources] = useState([]);
    const [activeSource, setActiveSource] = useState(null);
    const [frame, setFrame] = useState(null);
    const [frameShape, setFrameShape] = useState([480, 640]);
    const [pedestrians, setPedestrians] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [selectedPedestrianId, setSelectedPedestrianId] = useState(null);
    const [streamUrl, setStreamUrl] = useState("");
    const [selectedKavsak, setSelectedKavsak] = useState("");
    const [iframeUrl, setIframeUrl] = useState(""); // iframe için URL

    // Refs
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    // ==================== WebSocket ====================
    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;
            setWsStatus("connecting");

            ws.onopen = () => {
                setWsStatus("connected");
                console.log("✅ WebSocket bağlandı");
            };

            ws.onclose = () => {
                setWsStatus("disconnected");
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
            };

            ws.onerror = () => setWsStatus("error");

            ws.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);

                    if (data.type === "frame") {
                        setFrame(data.frame);
                        setFrameShape(data.frame_shape || [480, 640]);
                        setPedestrians(data.metrics?.pedestrians || []);
                        setMetrics(data.metrics);
                        setActiveSource(data.source);
                    } else if (data.type === "status") {
                        setStreamSources(data.sources || []);
                    }
                } catch (err) {
                    console.warn("WS parse error:", err);
                }
            };
        } catch (err) {
            setWsStatus("error");
        }
    }, []);

    useEffect(() => {
        connectWebSocket();
        fetchSources();
        return () => {
            wsRef.current?.close();
            clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connectWebSocket]);

    // ==================== API Calls ====================
    const fetchSources = async () => {
        try {
            const res = await fetch(`${API_URL}/stream/sources`);
            const data = await res.json();
            setStreamSources(data);
        } catch (err) {
            console.error("Sources fetch error:", err);
        }
    };

    const addHLSStream = async (url = streamUrl, name = "MOBESE Stream") => {
        const targetUrl = url || streamUrl;
        if (!targetUrl.trim()) return;
        try {
            await fetch(`${API_URL}/stream/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_id: `hls_${Date.now()}`,
                    name: name,
                    url: targetUrl,
                    source_type: "hls"
                })
            });
            fetchSources();
            if (url === streamUrl) setStreamUrl("");
        } catch (err) {
            console.error("Add stream error:", err);
        }
    };

    // Kavşak seçildiğinde - basit iframe yöntemi
    const handleKavsakChange = (e) => {
        const kavsakId = e.target.value;
        setSelectedKavsak(kavsakId);
        
        if (!kavsakId) {
            setIframeUrl("");
            return;
        }
        
        const kavsak = BURSA_KAVSAK_KAMERALARI.find(k => k.id === Number(kavsakId));
        if (kavsak) {
            // Direkt iframe URL'si olarak ayarla
            setIframeUrl(kavsak.url);
            console.log("Kavşak seçildi:", kavsak.name, kavsak.url);
        }
    };

    const startSource = async (sourceId) => {
        try {
            await fetch(`${API_URL}/stream/start/${sourceId}`, { method: "POST" });
            fetchSources();
        } catch (err) {
            console.error("Start error:", err);
        }
    };

    const stopSource = async (sourceId) => {
        try {
            await fetch(`${API_URL}/stream/stop/${sourceId}`, { method: "POST" });
            fetchSources();
        } catch (err) {
            console.error("Stop error:", err);
        }
    };

    const selectedPedestrian = pedestrians.find(p => p.id === selectedPedestrianId);
    const riskLevel = metrics?.summary?.riskLevel || "low";

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
            {/* Header */}
            <header className="glass-panel sticky top-0 z-50 px-6 py-3 mb-6 border-b border-slate-800/50">
                <div className="max-w-[1920px] mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                            <Activity className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">Akıllı Yaya Analiz Sistemi</h1>
                            <p className="text-xs text-slate-400">Gerçek Zamanlı Trafik & Yaya Güvenliği</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                            wsStatus === "connected" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                            wsStatus === "connecting" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                            "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                            {wsStatus === "connected" ? <Wifi size={14} /> : <WifiOff size={14} />}
                            {wsStatus === "connected" ? "Sistem Çevrimiçi" : "Bağlantı Yok"}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1920px] mx-auto px-6 pb-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Sidebar - Controls */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        <ControlPanel />
                        
                        {/* Kavşak Seçimi */}
                        <div className="glass-panel p-4 rounded-xl space-y-3">
                            <div className="flex items-center gap-2 text-slate-300 mb-2">
                                <MapPin size={18} className="text-blue-400" />
                                <h3 className="font-semibold text-sm uppercase tracking-wider">Kavşak Seçimi</h3>
                            </div>
                            <select
                                value={selectedKavsak}
                                onChange={handleKavsakChange}
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5"
                            >
                                <option value="">📍 Bir Kavşak Seçin...</option>
                                {BURSA_KAVSAK_KAMERALARI.map((kavsak) => (
                                    <option key={kavsak.id} value={kavsak.id}>
                                        {kavsak.id}. {kavsak.name}
                                    </option>
                                ))}
                            </select>
                            
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Özel RTSP/HLS URL"
                                    value={streamUrl}
                                    onChange={(e) => setStreamUrl(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 pr-10"
                                />
                                <button 
                                    onClick={() => addHLSStream()}
                                    className="absolute right-1 top-1 bottom-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors"
                                >
                                    Ekle
                                </button>
                            </div>
                        </div>

                        {/* Kaynak Listesi */}
                        <div className="glass-panel p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Signal size={18} className="text-purple-400" />
                                    <h3 className="font-semibold text-sm uppercase tracking-wider">Kaynaklar</h3>
                                </div>
                                <button onClick={fetchSources} className="text-xs text-slate-400 hover:text-white transition-colors">
                                    Yenile
                                </button>
                            </div>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                {streamSources.map((source) => (
                                    <div
                                        key={source.id}
                                        className={`p-3 rounded-lg flex items-center justify-between transition-all ${
                                            source.connected
                                                ? "bg-emerald-500/10 border border-emerald-500/20"
                                                : "bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800"
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${source.connected ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-600"}`} />
                                            <div className="truncate">
                                                <p className="text-sm font-medium text-slate-200 truncate">{source.name}</p>
                                                <p className="text-[10px] text-slate-500">{source.type} • {source.fps || 0} FPS</p>
                                            </div>
                                        </div>
                                        {source.connected ? (
                                            <button onClick={() => stopSource(source.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                                                <Square size={14} fill="currentColor" />
                                            </button>
                                        ) : (
                                            <button onClick={() => startSource(source.id)} className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-colors">
                                                <Play size={14} fill="currentColor" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {streamSources.length === 0 && (
                                    <div className="text-center py-6 text-slate-500 text-xs">
                                        Aktif kaynak bulunamadı
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Center - Video Display */}
                    <div className="col-span-12 lg:col-span-6 flex flex-col gap-6">
                        <VideoDisplay 
                            detections={pedestrians}
                            status={iframeUrl ? "Aktif" : (activeSource ? "Aktif" : "Bekleniyor")}
                            frame={frame}
                            frameShape={frameShape}
                            roadLengthMeters={10}
                            iframeUrl={iframeUrl}
                            selectedKavsakName={selectedKavsak ? BURSA_KAVSAK_KAMERALARI.find(k => k.id === Number(selectedKavsak))?.name : ""}
                        />
                        
                        <MetricsCards metrics={metrics} />
                    </div>

                    {/* Right Sidebar - Details */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        {/* Risk Status */}
                        <div className={`glass-panel p-5 rounded-xl border-l-4 ${
                            riskLevel === "critical" ? "border-l-red-500 bg-red-500/5" :
                            riskLevel === "high" ? "border-l-orange-500 bg-orange-500/5" :
                            riskLevel === "medium" ? "border-l-yellow-500 bg-yellow-500/5" :
                            "border-l-emerald-500 bg-emerald-500/5"
                        }`}>
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-slate-300">Risk Durumu</h3>
                                {riskLevel === "critical" && <AlertTriangle className="text-red-500 animate-pulse" size={20} />}
                            </div>
                            <p className={`text-2xl font-bold tracking-tight ${
                                riskLevel === "critical" ? "text-red-400" :
                                riskLevel === "high" ? "text-orange-400" :
                                riskLevel === "medium" ? "text-yellow-400" :
                                "text-emerald-400"
                            }`}>
                                {riskLevel === "critical" ? "KRİTİK SEVİYE" :
                                 riskLevel === "high" ? "YÜKSEK RİSK" :
                                 riskLevel === "medium" ? "ORTA RİSK" : "GÜVENLİ"}
                            </p>
                            {metrics?.traffic?.extensionTime > 0 && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20">
                                    <Clock size={14} />
                                    <span>+{metrics.traffic.extensionTime}sn ek süre tanımlandı</span>
                                </div>
                            )}
                        </div>

                        {/* Pedestrian List */}
                        <div className="glass-panel p-4 rounded-xl flex-1 flex flex-col min-h-[400px]">
                            <div className="flex items-center gap-2 text-slate-300 mb-4">
                                <Users size={18} className="text-blue-400" />
                                <h3 className="font-semibold text-sm uppercase tracking-wider">Yaya Listesi ({pedestrians.length})</h3>
                            </div>
                            
                            <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar max-h-[500px]">
                                {pedestrians.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                                        <Users size={32} className="mb-2 opacity-20" />
                                        <p className="text-sm">Yaya tespiti yok</p>
                                    </div>
                                ) : (
                                    pedestrians.map((p) => {
                                        const cat = CATEGORIES[p.category] || CATEGORIES.adult;
                                        const isSelected = p.id === selectedPedestrianId;
                                        return (
                                            <div
                                                key={p.id}
                                                onClick={() => setSelectedPedestrianId(isSelected ? null : p.id)}
                                                className={`p-3 rounded-lg cursor-pointer transition-all border ${
                                                    isSelected 
                                                        ? "bg-slate-700 border-emerald-500/50 shadow-lg shadow-emerald-900/20" 
                                                        : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600"
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">{cat.emoji}</span>
                                                        <span className="font-bold text-slate-200">#{p.id}</span>
                                                        <span className="text-xs text-slate-400 bg-slate-900/50 px-1.5 py-0.5 rounded">{cat.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
                                                        <Zap size={10} />
                                                        {p.speed?.kmh?.toFixed(1)} km/h
                                                    </div>
                                                </div>
                                                
                                                <div className="relative h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${cat.bgColor}`}
                                                        style={{ width: `${p.position?.percent || 0}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                                    <span>Başlangıç</span>
                                                    <span>{p.position?.percent}%</span>
                                                    <span>Bitiş</span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
