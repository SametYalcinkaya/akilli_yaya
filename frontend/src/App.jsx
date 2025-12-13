import { useEffect, useRef, useState, useCallback } from "react";

// ==================== Constants ====================
const CATEGORIES = {
    adult: { name: "Yetişkin", emoji: "🚶", color: "#3b82f6", bgColor: "bg-blue-500" },
    elderly: { name: "Yaşlı", emoji: "👴", color: "#a855f7", bgColor: "bg-purple-500" },
    child: { name: "Çocuk", emoji: "👶", color: "#ef4444", bgColor: "bg-red-500" },
    disabled: { name: "Engelli", emoji: "♿", color: "#f59e0b", bgColor: "bg-amber-500" },
};

const RISK_COLORS = {
    low: { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500" },
    medium: { bg: "bg-yellow-500/20", text: "text-yellow-400", border: "border-yellow-500" },
    high: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500" },
    critical: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500" },
};

const WS_URL = "ws://localhost:8001/ws/video-stream";
const API_URL = "http://localhost:8001/api";

// ==================== Main App ====================
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
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [calibrationPoints, setCalibrationPoints] = useState([]);
    const [roadLength, setRoadLength] = useState(10);

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

    const addHLSStream = async () => {
        if (!streamUrl.trim()) return;
        try {
            await fetch(`${API_URL}/stream/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    source_id: `hls_${Date.now()}`,
                    name: "MOBESE Stream",
                    url: streamUrl,
                    source_type: "hls"
                })
            });
            fetchSources();
            setStreamUrl("");
        } catch (err) {
            console.error("Add stream error:", err);
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

    const addWebcam = async () => {
        try {
            await fetch(`${API_URL}/stream/add-webcam?device_id=0`, { method: "POST" });
            fetchSources();
        } catch (err) {
            console.error("Webcam error:", err);
        }
    };

    const handleCalibration = async () => {
        if (calibrationPoints.length === 2) {
            try {
                await fetch(`${API_URL}/calibrate`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        start_point: calibrationPoints[0],
                        end_point: calibrationPoints[1],
                        road_length_m: roadLength
                    })
                });
                setIsCalibrating(false);
                setCalibrationPoints([]);
                alert("✅ Kalibrasyon tamamlandı!");
            } catch (err) {
                console.error("Calibration error:", err);
            }
        }
    };

    const handleCanvasClick = (e) => {
        if (!isCalibrating) return;

        const rect = e.target.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * frameShape[1];
        const y = ((e.clientY - rect.top) / rect.height) * frameShape[0];

        const newPoints = [...calibrationPoints, [x, y]];
        setCalibrationPoints(newPoints);

        if (newPoints.length >= 2) {
            setTimeout(() => handleCalibration(), 100);
        }
    };

    // ==================== Render ====================
    const selectedPedestrian = pedestrians.find(p => p.id === selectedPedestrianId);
    const riskLevel = metrics?.summary?.riskLevel || "low";
    const riskStyle = RISK_COLORS[riskLevel];

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            {/* Header */}
            <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">🚶 Akıllı Yaya Analiz Sistemi</h1>
                        <span className={`px-3 py-1 rounded-full text-sm ${wsStatus === "connected" ? "bg-green-500/20 text-green-400" :
                                wsStatus === "connecting" ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-red-500/20 text-red-400"
                            }`}>
                            {wsStatus === "connected" ? "🟢 Bağlı" :
                                wsStatus === "connecting" ? "🟡 Bağlanıyor..." : "🔴 Bağlantı Yok"}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="HLS/RTSP Stream URL"
                            value={streamUrl}
                            onChange={(e) => setStreamUrl(e.target.value)}
                            className="px-3 py-2 bg-slate-700 rounded-lg w-80 text-sm"
                        />
                        <button onClick={addHLSStream} className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500">
                            Ekle
                        </button>
                        <button onClick={addWebcam} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500">
                            📷 Webcam
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Panel - Video & Detection */}
                <div className="flex-1 p-4 flex flex-col gap-4">
                    {/* Video Player */}
                    <div className="relative bg-slate-800 rounded-xl overflow-hidden flex-1">
                        {frame ? (
                            <div
                                className="relative w-full h-full cursor-crosshair"
                                onClick={handleCanvasClick}
                            >
                                <img
                                    src={`data:image/jpeg;base64,${frame}`}
                                    alt="Video Stream"
                                    className="w-full h-full object-contain"
                                />
                                {/* Bounding Boxes Overlay */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    {pedestrians.map((p) => {
                                        const cat = CATEGORIES[p.category] || CATEGORIES.adult;
                                        const scaleX = 100 / frameShape[1];
                                        const scaleY = 100 / frameShape[0];
                                        const x = p.bbox[0] * scaleX;
                                        const y = p.bbox[1] * scaleY;
                                        const w = (p.bbox[2] - p.bbox[0]) * scaleX;
                                        const h = (p.bbox[3] - p.bbox[1]) * scaleY;
                                        const isSelected = p.id === selectedPedestrianId;
                                        const isCritical = p.id === metrics?.traffic?.criticalPedestrianId;

                                        return (
                                            <g key={p.id} style={{ cursor: 'pointer' }} onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedPedestrianId(isSelected ? null : p.id);
                                            }}>
                                                {/* Bounding Box */}
                                                <rect
                                                    x={`${x}%`}
                                                    y={`${y}%`}
                                                    width={`${w}%`}
                                                    height={`${h}%`}
                                                    fill="none"
                                                    stroke={isCritical ? "#ef4444" : cat.color}
                                                    strokeWidth={isSelected ? "4" : "2"}
                                                    className={isSelected ? "animate-pulse" : ""}
                                                />
                                                {/* ID Label Background */}
                                                <rect
                                                    x={`${x}%`}
                                                    y={`${Math.max(0, y - 5)}%`}
                                                    width="12%"
                                                    height="5%"
                                                    fill={cat.color}
                                                    rx="4"
                                                />
                                                {/* ID Text */}
                                                <text
                                                    x={`${x + 1}%`}
                                                    y={`${Math.max(3, y - 1.5)}%`}
                                                    fill="white"
                                                    fontSize="12"
                                                    fontWeight="bold"
                                                >
                                                    {cat.emoji} #{p.id}
                                                </text>
                                                {/* Bottom Info */}
                                                <text
                                                    x={`${x}%`}
                                                    y={`${Math.min(98, y + h + 3)}%`}
                                                    fill={cat.color}
                                                    fontSize="10"
                                                    fontWeight="bold"
                                                >
                                                    {p.speed?.kmh?.toFixed(1)}km/h | {p.eta ? `${p.eta}s` : "-"}
                                                </text>
                                            </g>
                                        );
                                    })}
                                    {/* Calibration Line */}
                                    {calibrationPoints.length === 2 && (
                                        <line
                                            x1={`${(calibrationPoints[0][0] / frameShape[1]) * 100}%`}
                                            y1={`${(calibrationPoints[0][1] / frameShape[0]) * 100}%`}
                                            x2={`${(calibrationPoints[1][0] / frameShape[1]) * 100}%`}
                                            y2={`${(calibrationPoints[1][1] / frameShape[0]) * 100}%`}
                                            stroke="#22c55e"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                        />
                                    )}
                                    {/* Calibration Points */}
                                    {calibrationPoints.map((point, i) => (
                                        <circle
                                            key={i}
                                            cx={`${(point[0] / frameShape[1]) * 100}%`}
                                            cy={`${(point[1] / frameShape[0]) * 100}%`}
                                            r="10"
                                            fill={i === 0 ? "#22c55e" : "#ef4444"}
                                            stroke="white"
                                            strokeWidth="2"
                                        />
                                    ))}
                                </svg>
                                {/* Calibration Overlay */}
                                {isCalibrating && (
                                    <div className="absolute top-4 left-4 bg-black/70 p-4 rounded-lg">
                                        <p className="text-lg font-bold mb-2">🎯 Kalibrasyon Modu</p>
                                        <p className="text-sm">
                                            {calibrationPoints.length === 0
                                                ? "1️⃣ Yaya geçidi BAŞLANGIÇ noktasına tıklayın"
                                                : calibrationPoints.length === 1
                                                    ? "2️⃣ Yaya geçidi BİTİŞ noktasına tıklayın"
                                                    : "✅ Tamamlandı!"}
                                        </p>
                                        <div className="mt-2 flex items-center gap-2">
                                            <span className="text-xs">Yol uzunluğu:</span>
                                            <input
                                                type="number"
                                                value={roadLength}
                                                onChange={(e) => setRoadLength(Number(e.target.value))}
                                                className="w-16 px-2 py-1 bg-slate-700 rounded text-sm"
                                            />
                                            <span className="text-xs">metre</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <div className="text-center">
                                    <p className="text-6xl mb-4">📹</p>
                                    <p className="text-xl">Video akışı yok</p>
                                    <p className="text-sm mt-2">Bir kaynak ekleyip başlatın</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stream Sources */}
                    <div className="bg-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">📡 Video Kaynakları</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setIsCalibrating(!isCalibrating);
                                        setCalibrationPoints([]);
                                    }}
                                    className={`px-3 py-1 rounded-lg text-sm ${isCalibrating ? "bg-red-600" : "bg-slate-700 hover:bg-slate-600"
                                        }`}
                                >
                                    🎯 {isCalibrating ? "İptal" : "Kalibre Et"}
                                </button>
                                <button
                                    onClick={fetchSources}
                                    className="px-3 py-1 rounded-lg text-sm bg-slate-700 hover:bg-slate-600"
                                >
                                    🔄 Yenile
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            {streamSources.map((source) => (
                                <div
                                    key={source.id}
                                    className={`px-3 py-2 rounded-lg flex items-center gap-2 ${source.connected
                                            ? "bg-emerald-600/20 border border-emerald-500"
                                            : "bg-slate-700"
                                        }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${source.connected ? "bg-emerald-500 animate-pulse" : "bg-slate-500"
                                        }`} />
                                    <span className="text-sm">{source.name}</span>
                                    <span className="text-xs text-slate-400">
                                        {source.connected && source.fps > 0 ? `${source.fps} FPS` : ""}
                                    </span>
                                    {source.connected ? (
                                        <button
                                            onClick={() => stopSource(source.id)}
                                            className="text-red-400 hover:text-red-300 ml-2"
                                        >
                                            ⏹
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => startSource(source.id)}
                                            className="text-emerald-400 hover:text-emerald-300 ml-2"
                                        >
                                            ▶
                                        </button>
                                    )}
                                </div>
                            ))}
                            {streamSources.length === 0 && (
                                <p className="text-slate-400 text-sm">Henüz kaynak eklenmedi. Yukarıdan URL ekleyin veya webcam başlatın.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Metrics Dashboard */}
                <div className="w-[420px] bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
                    {/* Risk Level */}
                    <div className={`rounded-xl p-4 mb-4 border ${riskStyle.bg} ${riskStyle.border}`}>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-300">Risk Seviyesi</span>
                            <span className={`px-3 py-1 rounded-full font-bold uppercase ${riskStyle.text}`}>
                                {riskLevel === "low" ? "DÜŞÜK" :
                                    riskLevel === "medium" ? "ORTA" :
                                        riskLevel === "high" ? "YÜKSEK" : "KRİTİK"}
                            </span>
                        </div>
                        {metrics?.traffic?.extensionTime > 0 && (
                            <div className="mt-2 text-center">
                                <span className="text-amber-400 font-bold text-lg animate-pulse">
                                    ⚠️ +{metrics.traffic.extensionTime}s ek süre gerekli
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <StatCard
                            title="Toplam Yaya"
                            value={metrics?.summary?.total || 0}
                            icon="👥"
                        />
                        <StatCard
                            title="Geçiş Yapan"
                            value={metrics?.summary?.crossing || 0}
                            icon="🚶"
                        />
                        <StatCard
                            title="Ort. Hız"
                            value={`${(metrics?.summary?.avgSpeed || 0).toFixed(1)} m/s`}
                            icon="⚡"
                        />
                        <StatCard
                            title="Gereken Süre"
                            value={`${metrics?.traffic?.requiredGreenTime || 0}s`}
                            icon="⏱️"
                            highlight={metrics?.traffic?.extensionTime > 0}
                        />
                    </div>

                    {/* Category Distribution */}
                    <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
                        <h4 className="font-semibold mb-3">📊 Kategori Dağılımı</h4>
                        <div className="space-y-2">
                            {Object.entries(CATEGORIES).map(([key, cat]) => {
                                const count = metrics?.summary?.byCategory?.[key] || 0;
                                const total = Math.max(metrics?.summary?.total || 1, 1);
                                const percent = (count / total) * 100;
                                return (
                                    <div key={key} className="flex items-center gap-2">
                                        <span className="w-8 text-lg">{cat.emoji}</span>
                                        <span className="w-20 text-sm">{cat.name}</span>
                                        <div className="flex-1 h-3 bg-slate-600 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${cat.bgColor} transition-all duration-300`}
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span className="w-8 text-right text-sm font-bold">{count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Pedestrian List */}
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <h4 className="font-semibold mb-3">🎯 Tespit Edilen Yayalar</h4>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                            {pedestrians.length === 0 ? (
                                <p className="text-slate-400 text-sm text-center py-8">
                                    Henüz tespit edilen yaya yok.<br />
                                    Video kaynağı başlatın.
                                </p>
                            ) : (
                                pedestrians.map((p) => {
                                    const cat = CATEGORIES[p.category] || CATEGORIES.adult;
                                    const isSelected = p.id === selectedPedestrianId;
                                    const isCritical = p.id === metrics?.traffic?.criticalPedestrianId;

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => setSelectedPedestrianId(isSelected ? null : p.id)}
                                            className={`p-3 rounded-lg cursor-pointer transition-all ${isSelected
                                                    ? "bg-slate-600 ring-2 ring-emerald-500"
                                                    : isCritical
                                                        ? "bg-red-900/30 ring-1 ring-red-500"
                                                        : "bg-slate-600/50 hover:bg-slate-600"
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl">{cat.emoji}</span>
                                                    <div>
                                                        <span className="font-bold text-lg">#{p.id}</span>
                                                        <span className="text-sm text-slate-400 ml-2">{cat.name}</span>
                                                    </div>
                                                </div>
                                                {isCritical && (
                                                    <span className="px-2 py-1 bg-red-500/30 text-red-400 text-xs rounded-full font-bold animate-pulse">
                                                        ⚠️ KRİTİK
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Hız:</span>
                                                    <span className="font-medium">{p.speed?.kmh?.toFixed(1)} km/h</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">ETA:</span>
                                                    <span className="font-medium">{p.eta ? `${p.eta}s` : "-"}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">İlerleme:</span>
                                                    <span className="font-medium">{p.position?.percent}%</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-slate-400">Kalan:</span>
                                                    <span className="font-medium">{p.distanceRemaining}m</span>
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-300 ${cat.bgColor}`}
                                                    style={{ width: `${p.position?.percent || 0}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Selected Pedestrian Details */}
                    {selectedPedestrian && (
                        <div className="mt-4 bg-emerald-900/30 rounded-xl p-4 border border-emerald-500/50">
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <span className="text-2xl">{CATEGORIES[selectedPedestrian.category]?.emoji}</span>
                                <span>Detaylı Bilgi - #{selectedPedestrian.id}</span>
                            </h4>
                            <div className="space-y-2 text-sm">
                                <DetailRow label="Kategori" value={CATEGORIES[selectedPedestrian.category]?.name} />
                                <DetailRow label="Konum (X, Y)" value={`${selectedPedestrian.position?.x}, ${selectedPedestrian.position?.y}`} />
                                <DetailRow label="Hız (m/s)" value={`${selectedPedestrian.speed?.mps} m/s`} />
                                <DetailRow label="Hız (km/h)" value={`${selectedPedestrian.speed?.kmh} km/h`} />
                                <DetailRow label="Yön" value={selectedPedestrian.direction} />
                                <DetailRow label="Kalan Mesafe" value={`${selectedPedestrian.distanceRemaining} metre`} />
                                <DetailRow label="Tahmini Geçiş" value={selectedPedestrian.eta ? `${selectedPedestrian.eta} saniye` : "Hesaplanamadı"} />
                                <DetailRow label="Geçitte Geçen Süre" value={`${selectedPedestrian.timeInFrame} saniye`} />
                                <DetailRow label="Durum" value={
                                    selectedPedestrian.status === "crossing" ? "🚶 Geçiş yapıyor" :
                                        selectedPedestrian.status === "waiting" ? "⏳ Bekliyor" : "🧍 Duruyor"
                                } />
                                <DetailRow label="Öncelik Seviyesi" value={`${selectedPedestrian.priority}/5 ⭐`} />
                            </div>
                        </div>
                    )}

                    {/* Active Source Info */}
                    {activeSource && (
                        <div className="mt-4 bg-slate-700/30 rounded-xl p-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400">Aktif Kaynak:</span>
                                <span>{activeSource.name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">Çözünürlük:</span>
                                <span>{activeSource.width}x{activeSource.height}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">FPS:</span>
                                <span>{activeSource.fps}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ==================== Sub Components ====================
function StatCard({ title, value, icon, highlight = false }) {
    return (
        <div className={`p-4 rounded-xl ${highlight
                ? "bg-amber-600/20 border border-amber-500 animate-pulse"
                : "bg-slate-700/50"
            }`}>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{icon}</span>
                <span className="text-xs text-slate-400">{title}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="flex justify-between py-1 border-b border-slate-700/50">
            <span className="text-slate-400">{label}:</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}
