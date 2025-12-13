import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Target, Settings, AlertCircle, Video, Eye, EyeOff, MousePointer2, MapPin, Check } from 'lucide-react';

// Kategori renkleri
const CATEGORY_COLORS = {
    child: '#ef4444',    // kırmızı
    elderly: '#a855f7',  // mor
    disabled: '#f59e0b', // turuncu
    adult: '#3b82f6'     // mavi
};

const CATEGORY_NAMES = {
    child: 'Çocuk',
    elderly: 'Yaşlı',
    disabled: 'Engelli',
    adult: 'Yetişkin'
};

export function VideoDisplay({
    detections = [],
    status = "Bekleniyor",
    frame = null,
    frameShape = [480, 640],
    calibrationLines = [],
    roadLengthMeters = 10,
    iframeUrl = "",
    selectedKavsakName = "",
    onCalibrate = null,
    analysisActive = false
}) {
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [localCalib, setLocalCalib] = useState(calibrationLines);
    const [showOverlay, setShowOverlay] = useState(true);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [roadLength, setRoadLength] = useState(roadLengthMeters);
    const imageRef = useRef(null);

    // Kalibrasyon noktası ekleme
    const handleClick = useCallback((e) => {
        if (!isCalibrating || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * frameShape[1];
        const y = ((e.clientY - rect.top) / rect.height) * frameShape[0];

        const newPoints = [...localCalib, [x, y]];
        setLocalCalib(newPoints);

        // 2 nokta seçildiyse kalibrasyon hazır
        if (newPoints.length >= 2) {
            console.log("Kalibrasyon noktaları:", newPoints);
        }
    }, [isCalibrating, localCalib, frameShape]);

    // Kalibrasyonu backend'e gönder
    const submitCalibration = useCallback(async () => {
        if (localCalib.length < 2) return;

        const API_URL = `http://${import.meta.env.VITE_BACKEND_HOST || 'localhost:8001'}/api`;
        
        try {
            const response = await fetch(`${API_URL}/calibrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_point: localCalib[0],
                    end_point: localCalib[1],
                    road_length_m: roadLength
                })
            });

            if (response.ok) {
                console.log("✅ Kalibrasyon başarılı");
                if (onCalibrate) onCalibrate(localCalib, roadLength);
                setIsCalibrating(false);
            } else {
                console.error("❌ Kalibrasyon hatası");
            }
        } catch (err) {
            console.error("Kalibrasyon API hatası:", err);
        }
    }, [localCalib, roadLength, onCalibrate]);

    const handleMouseMove = (e) => {
        if (!imageRef.current) return;
        const rect = imageRef.current.getBoundingClientRect();
        setMousePos({
            x: Math.round(((e.clientX - rect.left) / rect.width) * frameShape[1]),
            y: Math.round(((e.clientY - rect.top) / rect.height) * frameShape[0])
        });
    };

    return (
        <div className="glass-panel p-1 rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
            {/* Video Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700/50 bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${status === "Aktif" ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-700/50 text-slate-400"}`}>
                        <Video size={18} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-200 text-sm">Canlı Kamera Akışı</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${status === "Aktif" ? "bg-emerald-500 animate-pulse" : "bg-slate-500"}`} />
                            <span className="text-xs text-slate-400">{status}</span>
                            {frameShape && <span className="text-xs text-slate-600">| {frameShape[1]}x{frameShape[0]}px</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowOverlay(!showOverlay)}
                        className={`p-2 rounded-lg transition-colors ${showOverlay ? "text-blue-400 hover:bg-blue-500/10" : "text-slate-500 hover:bg-slate-700"}`}
                        title="Çizimleri Göster/Gizle"
                    >
                        {showOverlay ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                    <button
                        onClick={() => {
                            setIsCalibrating(!isCalibrating);
                            if (!isCalibrating) setLocalCalib([]);
                        }}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${isCalibrating ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "text-slate-400 hover:bg-slate-700"}`}
                        title="Kalibrasyon Modu"
                    >
                        <Target size={18} />
                        {isCalibrating && <span className="text-xs font-medium">Kalibre Et</span>}
                    </button>
                    <button className="p-2 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                        <Maximize2 size={18} />
                    </button>
                </div>
            </div>

            {/* Video Container */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden group">
                {/* Analiz aktif ve frame var: WebSocket stream göster */}
                {analysisActive && frame ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        {/* Kavşak Bilgisi */}
                        <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <MapPin size={14} className="text-cyan-400" />
                            <span className="text-white text-sm font-medium">{selectedKavsakName || 'Akıllı Yaya Tespiti'}</span>
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        </div>
                        
                        <img
                            ref={imageRef}
                            src={`data:image/jpeg;base64,${frame}`}
                            alt="Stream"
                            className="max-w-full max-h-full object-contain select-none"
                            onClick={handleClick}
                            onMouseMove={handleMouseMove}
                            style={{ cursor: isCalibrating ? 'crosshair' : 'default' }}
                        />

                        {/* Overlay Layer */}
                        {showOverlay && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${frameShape[1]} ${frameShape[0]}`} preserveAspectRatio="xMidYMid meet">
                                {/* Detections */}
                                {detections.map((det) => {
                                    const color = CATEGORY_COLORS[det.category] || CATEGORY_COLORS.adult;
                                    const categoryName = CATEGORY_NAMES[det.category] || 'Yetişkin';
                                    return (
                                        <g key={det.id}>
                                            <rect
                                                x={det.bbox[0]}
                                                y={det.bbox[1]}
                                                width={det.bbox[2] - det.bbox[0]}
                                                height={det.bbox[3] - det.bbox[1]}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="3"
                                                className="drop-shadow-md"
                                            />
                                            <rect
                                                x={det.bbox[0]}
                                                y={det.bbox[1] - 24}
                                                width="80"
                                                height="22"
                                                fill={color}
                                                rx="4"
                                            />
                                            <text
                                                x={det.bbox[0] + 5}
                                                y={det.bbox[1] - 8}
                                                fill="white"
                                                fontSize="12"
                                                fontWeight="bold"
                                            >
                                                {categoryName}
                                            </text>
                                        </g>
                                    );
                                })}

                                {/* Calibration Lines */}
                                {localCalib.map((point, i) => (
                                    <circle key={i} cx={point[0]} cy={point[1]} r="6" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                ))}
                                {localCalib.length === 2 && (
                                    <line
                                        x1={localCalib[0][0]} y1={localCalib[0][1]}
                                        x2={localCalib[1][0]} y2={localCalib[1][1]}
                                        stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,4"
                                    />
                                )}
                            </svg>
                        )}
                    </div>
                ) : analysisActive && !frame ? (
                    /* Analiz aktif ama frame henüz gelmedi: Yükleniyor göster */
                    <div className="flex flex-col items-center justify-center gap-4 text-slate-400">
                        <div className="w-16 h-16 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin" />
                        <div className="text-center">
                            <p className="font-medium">HLS Stream Yükleniyor...</p>
                            <p className="text-sm text-slate-500">Yaya tespiti başlatılıyor</p>
                        </div>
                    </div>
                ) : iframeUrl ? (
                    <div className="relative w-full h-full flex flex-col">
                        {/* Kavşak Bilgisi */}
                        <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <MapPin size={14} className="text-cyan-400" />
                            <span className="text-white text-sm font-medium">{selectedKavsakName || 'Bursa Kavşak Kamerası'}</span>
                        </div>
                        
                        {/* iframe Video */}
                        <iframe
                            src={iframeUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                            title={selectedKavsakName || 'Bursa Kavşak Kamerası'}
                            style={{ pointerEvents: isCalibrating ? 'none' : 'auto' }}
                        />
                        
                        {/* Kalibrasyon Overlay - iframe üzerinde çalışır - sadece nokta seçimi için */}
                        {isCalibrating && localCalib.length < 2 && (
                            <div 
                                ref={imageRef}
                                className="absolute inset-0 z-20"
                                style={{ cursor: 'crosshair' }}
                                onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = Math.round(((e.clientX - rect.left) / rect.width) * frameShape[1]);
                                    const y = Math.round(((e.clientY - rect.top) / rect.height) * frameShape[0]);
                                    
                                    const newPoints = [...localCalib, [x, y]];
                                    setLocalCalib(newPoints);
                                    console.log("Kalibrasyon noktası eklendi:", [x, y]);
                                }}
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setMousePos({
                                        x: Math.round(((e.clientX - rect.left) / rect.width) * frameShape[1]),
                                        y: Math.round(((e.clientY - rect.top) / rect.height) * frameShape[0])
                                    });
                                }}
                            >
                                {/* Kalibrasyon Çizimleri */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${frameShape[1]} ${frameShape[0]}`} preserveAspectRatio="none">
                                    {localCalib.map((point, i) => (
                                        <circle key={i} cx={point[0]} cy={point[1]} r="8" fill="#f59e0b" stroke="white" strokeWidth="3" />
                                    ))}
                                </svg>
                                
                                {/* Mouse pozisyonu göstergesi */}
                                <div className="absolute bottom-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg font-mono">
                                    📍 X: {mousePos.x}, Y: {mousePos.y}
                                </div>
                            </div>
                        )}
                        
                        {/* Kalibrasyon tamamlandıktan sonra sadece çizgiyi göster */}
                        {isCalibrating && localCalib.length === 2 && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox={`0 0 ${frameShape[1]} ${frameShape[0]}`} preserveAspectRatio="none">
                                {localCalib.map((point, i) => (
                                    <circle key={i} cx={point[0]} cy={point[1]} r="8" fill="#f59e0b" stroke="white" strokeWidth="3" />
                                ))}
                                <line
                                    x1={localCalib[0][0]} y1={localCalib[0][1]}
                                    x2={localCalib[1][0]} y2={localCalib[1][1]}
                                    stroke="#f59e0b" strokeWidth="4" strokeDasharray="10,6"
                                />
                            </svg>
                        )}
                    </div>
                ) : frame ? (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <img
                            ref={imageRef}
                            src={`data:image/jpeg;base64,${frame}`}
                            alt="Stream"
                            className="max-w-full max-h-full object-contain select-none"
                            onClick={handleClick}
                            onMouseMove={handleMouseMove}
                            style={{ cursor: isCalibrating ? 'crosshair' : 'default' }}
                        />

                        {/* Overlay Layer */}
                        {showOverlay && (
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${frameShape[1]} ${frameShape[0]}`} preserveAspectRatio="xMidYMid meet">
                                {/* Detections */}
                                {detections.map((det) => {
                                    const color = CATEGORY_COLORS[det.category] || CATEGORY_COLORS.adult;
                                    const categoryName = CATEGORY_NAMES[det.category] || 'Yetişkin';
                                    return (
                                        <g key={det.id}>
                                            <rect
                                                x={det.bbox[0]}
                                                y={det.bbox[1]}
                                                width={det.bbox[2] - det.bbox[0]}
                                                height={det.bbox[3] - det.bbox[1]}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="3"
                                                className="drop-shadow-md"
                                            />
                                            {/* Label Background */}
                                            <rect
                                                x={det.bbox[0]}
                                                y={det.bbox[1] - 24}
                                                width="80"
                                                height="22"
                                                fill={color}
                                                rx="4"
                                            />
                                            {/* Label Text */}
                                            <text
                                                x={det.bbox[0] + 5}
                                                y={det.bbox[1] - 8}
                                                fill="white"
                                                fontSize="12"
                                                fontWeight="bold"
                                            >
                                                {categoryName}
                                            </text>
                                            {/* Confidence Score */}
                                            {det.score && (
                                                <text
                                                    x={det.bbox[2] - 35}
                                                    y={det.bbox[1] - 8}
                                                    fill="white"
                                                    fontSize="10"
                                                >
                                                    {Math.round(det.score * 100)}%
                                                </text>
                                            )}
                                        </g>
                                    );
                                })}

                                {/* Calibration Lines */}
                                {localCalib.map((point, i) => (
                                    <circle key={i} cx={point[0]} cy={point[1]} r="6" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                ))}
                                {localCalib.length === 2 && (
                                    <line
                                        x1={localCalib[0][0]} y1={localCalib[0][1]}
                                        x2={localCalib[1][0]} y2={localCalib[1][1]}
                                        stroke="#f59e0b" strokeWidth="3" strokeDasharray="8,4"
                                    />
                                )}
                            </svg>
                        )}

                        {/* Mouse Position Info (Debug) */}
                        {isCalibrating && (
                            <div className="absolute bottom-4 right-4 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono pointer-events-none">
                                X: {mousePos.x}, Y: {mousePos.y}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center mb-4">
                            <Video size={32} className="opacity-50" />
                        </div>
                        <p className="text-sm font-medium">Sinyal Bekleniyor...</p>
                        <p className="text-xs opacity-50 mt-1">Lütfen bir kamera kaynağı seçin</p>
                    </div>
                )}

                {/* Calibration Instructions Overlay */}
                {isCalibrating && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-4 py-3 rounded-xl shadow-lg backdrop-blur-sm z-30 border border-amber-500/30">
                        <div className="flex items-center gap-2 mb-2">
                            <MousePointer2 size={16} className="text-amber-400" />
                            <span className="text-sm font-medium">
                                {localCalib.length === 0 ? "Başlangıç noktasını seçin" :
                                    localCalib.length === 1 ? "Bitiş noktasını seçin" : "Kalibrasyon hazır!"}
                            </span>
                        </div>

                        {localCalib.length === 2 && (
                            <div className="flex items-center gap-2 mt-2">
                                <label className="text-xs text-slate-400">Yol uzunluğu (m):</label>
                                <input
                                    type="number"
                                    value={roadLength}
                                    onChange={(e) => setRoadLength(parseFloat(e.target.value) || 8)}
                                    className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-sm text-white"
                                    min="1"
                                    max="50"
                                    step="0.5"
                                />
                                <button
                                    onClick={submitCalibration}
                                    className="flex items-center gap-1 px-3 py-1 bg-emerald-500 hover:bg-emerald-600 rounded text-sm font-medium transition-colors"
                                >
                                    <Check size={14} />
                                    Kaydet
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
