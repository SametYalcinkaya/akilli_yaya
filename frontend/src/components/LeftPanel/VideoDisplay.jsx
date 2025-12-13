import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Target, Settings, AlertCircle, Video, Eye, EyeOff, MousePointer2, MapPin } from 'lucide-react';

export function VideoDisplay({ 
    detections = [], 
    status = "Bekleniyor", 
    frame = null, 
    frameShape = [480, 640],
    calibrationLines = [],
    roadLengthMeters = 10,
    iframeUrl = "",
    selectedKavsakName = ""
}) {
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [localCalib, setLocalCalib] = useState(calibrationLines);
    const [showOverlay, setShowOverlay] = useState(true);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const imageRef = useRef(null);

    // Kalibrasyon noktası ekleme
    const handleClick = useCallback((e) => {
        if (!isCalibrating || !imageRef.current) return;

        const rect = imageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * frameShape[1];
        const y = ((e.clientY - rect.top) / rect.height) * frameShape[0];

        const newPoints = [...localCalib, [x, y]];
        setLocalCalib(newPoints);

        // 2 nokta seçildiyse kalibrasyonu tamamla (Burada API çağrısı yapılabilir)
        if (newPoints.length >= 2) {
            console.log("Kalibrasyon noktaları:", newPoints);
            // Parent component'e bildirilebilir
        }
    }, [isCalibrating, localCalib, frameShape]);

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
                {iframeUrl ? (
                    <div className="relative w-full h-full flex flex-col">
                        {/* Kavşak Bilgisi */}
                        <div className="absolute top-2 left-2 z-10 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-lg flex items-center gap-2">
                            <MapPin size={14} className="text-cyan-400" />
                            <span className="text-white text-sm font-medium">{selectedKavsakName || 'Bursa Kavşak Kamerası'}</span>
                        </div>
                        <iframe
                            src={iframeUrl}
                            className="w-full h-full border-0"
                            allowFullScreen
                            allow="autoplay; encrypted-media"
                            title={selectedKavsakName || 'Bursa Kavşak Kamerası'}
                        />
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
                                {detections.map((det) => (
                                    <g key={det.id}>
                                        <rect
                                            x={det.bbox[0]}
                                            y={det.bbox[1]}
                                            width={det.bbox[2] - det.bbox[0]}
                                            height={det.bbox[3] - det.bbox[1]}
                                            fill="none"
                                            stroke={det.category === 'child' ? '#ef4444' : '#3b82f6'}
                                            strokeWidth="2"
                                            className="drop-shadow-md"
                                        />
                                        {/* Label */}
                                        <rect
                                            x={det.bbox[0]}
                                            y={det.bbox[1] - 20}
                                            width="60"
                                            height="20"
                                            fill={det.category === 'child' ? '#ef4444' : '#3b82f6'}
                                            rx="4"
                                        />
                                        <text
                                            x={det.bbox[0] + 5}
                                            y={det.bbox[1] - 6}
                                            fill="white"
                                            fontSize="12"
                                            fontWeight="bold"
                                        >
                                            #{det.id}
                                        </text>
                                    </g>
                                ))}

                                {/* Calibration Lines */}
                                {localCalib.map((point, i) => (
                                    <circle key={i} cx={point[0]} cy={point[1]} r="4" fill="#f59e0b" stroke="white" strokeWidth="2" />
                                ))}
                                {localCalib.length === 2 && (
                                    <line 
                                        x1={localCalib[0][0]} y1={localCalib[0][1]} 
                                        x2={localCalib[1][0]} y2={localCalib[1][1]} 
                                        stroke="#f59e0b" strokeWidth="2" strokeDasharray="5,5" 
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
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/90 text-white px-4 py-2 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-2 z-10">
                        <MousePointer2 size={16} />
                        <span className="text-sm font-medium">
                            {localCalib.length === 0 ? "Başlangıç noktasını seçin" : 
                             localCalib.length === 1 ? "Bitiş noktasını seçin" : "Kalibrasyon tamamlandı"}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
