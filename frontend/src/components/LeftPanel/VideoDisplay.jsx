import { useCallback, useEffect, useRef, useState } from "react";

function toPercent(n) {
    return `${Math.max(0, Math.min(100, n))}%`;
}

function Line({ x1, y1, x2, y2 }) {
    const left = Math.min(x1, x2);
    const top = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    const length = Math.sqrt(width * width + height * height);
    return (
        <div
            className="absolute origin-top-left rounded-full bg-emerald-400/70"
            style={{
                left: toPercent(left),
                top: toPercent(top),
                width: toPercent(length),
                height: "2px",
                transform: `rotate(${angle}deg)`
            }}
        />
    );
}

export function VideoDisplay({ detections = [], status, frame, frameShape, calibrationLines, roadLengthMeters }) {
    const [frameH, frameW] = frameShape || [360, 640];
    const containerRef = useRef(null);
    const [pendingPoints, setPendingPoints] = useState([]);
    const [localCalib, setLocalCalib] = useState(calibrationLines);
    const [calibrating, setCalibrating] = useState(false);
    const [roadLength, setRoadLength] = useState("8.0");

    // keep local calibration in sync when server updates
    useEffect(() => {
        if (calibrationLines) {
            setLocalCalib(calibrationLines);
        }
    }, [calibrationLines]);

    // sync road length from backend when provided
    useEffect(() => {
        if (roadLengthMeters) {
            setRoadLength(String(roadLengthMeters));
        }
    }, [roadLengthMeters]);

    const handleClick = useCallback(
        async (e) => {
            if (!frame || !calibrating) return;
            const rect = containerRef.current?.getBoundingClientRect();
            if (!rect) return;
            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            const nextPoints = [...pendingPoints, [xPct, yPct]].slice(-2);
            setPendingPoints(nextPoints);
            if (nextPoints.length === 2) {
                const start_line = [
                    (nextPoints[0][0] / 100) * frameW,
                    (nextPoints[0][1] / 100) * frameH,
                ];
                const end_line = [
                    (nextPoints[1][0] / 100) * frameW,
                    (nextPoints[1][1] / 100) * frameH,
                ];
                const roadLengthM = Math.max(0.1, Number(roadLength) || 0);
                try {
                    await fetch("/api/calibrate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ start_line, end_line, road_length_m: roadLengthM }),
                    });
                    setLocalCalib([start_line, end_line]);
                } catch (err) {
                    console.error("Calibration failed", err);
                } finally {
                    setPendingPoints([]);
                    setCalibrating(false);
                }
            }
        },
        [frame, frameH, frameW, pendingPoints, calibrating, roadLength]
    );
    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            className="relative h-[360px] w-full overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800"
        >
            {frame ? (
                <img
                    src={`data:image/jpeg;base64,${frame}`}
                    alt="Akış"
                    className="h-full w-full object-cover opacity-90"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                    Canlı akış henüz bağlı değil
                </div>
            )}

            {Array.isArray(localCalib) && localCalib.length === 2 && localCalib[0] && localCalib[1] && (
                <Line
                    x1={(localCalib[0][0] / frameW) * 100}
                    y1={(localCalib[0][1] / frameH) * 100}
                    x2={(localCalib[1][0] / frameW) * 100}
                    y2={(localCalib[1][1] / frameH) * 100}
                />
            )}

            {detections.map((det, idx) => (
                (() => {
                    const [x1, y1, x2, y2] = det.bbox || [0, 0, 0, 0];
                    const left = (x1 / frameW) * 100;
                    const top = (y1 / frameH) * 100;
                    const width = ((x2 - x1) / frameW) * 100;
                    const height = ((y2 - y1) / frameH) * 100;
                    return (
                        <div
                            key={`${det.track_id || det.id || idx}`}
                            className="absolute rounded border border-emerald-400/70 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-100"
                            style={{
                                left: toPercent(left),
                                top: toPercent(top),
                                width: toPercent(width),
                                height: toPercent(height),
                            }}
                        >
                            {det.category || "adult"} · {(det.score || 0).toFixed(2)}
                        </div>
                    );
                })()
            ))}

            <div className="absolute left-4 top-4 text-xs uppercase tracking-widest text-slate-200 drop-shadow">
                Video Feed · {status}
            </div>
            <div className="absolute right-4 top-4 flex items-center gap-2 text-xs">
                <label
                    className="flex items-center gap-1 rounded-md bg-slate-800/80 px-2 py-1 text-slate-100"
                    onClick={(e) => e.stopPropagation()}
                >
                    <span>Yol (m)</span>
                    <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={roadLength}
                        onChange={(e) => setRoadLength(e.target.value)}
                        className="w-16 rounded bg-slate-700 px-1 py-0.5 text-right text-slate-50 outline-none"
                    />
                </label>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setCalibrating((v) => !v);
                        setPendingPoints([]);
                    }}
                    className={`rounded-md px-2 py-1 font-semibold transition ${calibrating
                        ? "bg-emerald-500 text-emerald-950"
                        : "bg-slate-700 text-slate-100"
                        }`}
                >
                    Kalibrasyon
                </button>
                {calibrating && <span className="text-emerald-200">2 nokta seç</span>}
            </div>
        </div>
    );
}
