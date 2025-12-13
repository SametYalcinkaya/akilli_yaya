import { useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_BACKEND_API || "http://localhost:8001";

export function ControlPanel() {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    // Kamera başlat
    const startCamera = async () => {
        try {
            setStatus("Kamera başlatılıyor...");
            const res = await fetch(`${API_BASE}/api/start-camera`, { method: "POST" });
            const data = await res.json();
            setStatus("✅ Kamera aktif");
            console.log("Camera started:", data);
        } catch (error) {
            setStatus("❌ Kamera hatası");
            console.error("Camera start failed:", error);
        }
    };

    // Video yükle
    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setStatus(`📤 Yükleniyor: ${file.name}`);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${API_BASE}/api/upload-video`, {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            setStatus(`✅ Video oynatılıyor: ${file.name}`);
            console.log("Video uploaded:", data);
        } catch (error) {
            setStatus("❌ Video yükleme hatası");
            console.error("Video upload failed:", error);
        } finally {
            setUploading(false);
            e.target.value = "";
        }
    };

    // Durdur
    const stopStream = async () => {
        try {
            await fetch(`${API_BASE}/api/stop`, { method: "POST" });
            setStatus("⏹️ Durduruldu");
        } catch (error) {
            console.error("Stop failed:", error);
        }
    };

    // Reset
    const resetSystem = async () => {
        try {
            await fetch(`${API_BASE}/api/reset`, { method: "POST" });
            setStatus("🔄 Sıfırlandı");
        } catch (error) {
            console.error("Reset failed:", error);
        }
    };

    return (
        <div className="space-y-3">
            {/* Ana kontroller */}
            <div className="flex flex-wrap gap-2">
                {/* Kamera Başlat */}
                <button
                    onClick={startCamera}
                    className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-900/30 hover:bg-emerald-400 transition-colors"
                >
                    <span>📷</span>
                    <span>Canlı Kamera</span>
                </button>

                {/* Video Yükle */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-semibold text-blue-950 shadow-md shadow-blue-900/30 hover:bg-blue-400 transition-colors disabled:opacity-50"
                >
                    <span>🎬</span>
                    <span>{uploading ? "Yükleniyor..." : "Video Yükle"}</span>
                </button>

                {/* Durdur */}
                <button
                    onClick={stopStream}
                    className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-md shadow-amber-900/30 hover:bg-amber-400 transition-colors"
                >
                    <span>⏹️</span>
                    <span>Durdur</span>
                </button>

                {/* Reset */}
                <button
                    onClick={resetSystem}
                    className="flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-md shadow-slate-900/30 hover:bg-slate-500 transition-colors"
                >
                    <span>🔄</span>
                    <span>Reset</span>
                </button>
            </div>

            {/* Durum göstergesi */}
            {status && (
                <div className="text-sm text-slate-300 bg-slate-800/50 rounded-lg px-3 py-2">
                    {status}
                </div>
            )}

            {/* Gizli file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Yardım metni */}
            <div className="text-xs text-slate-500">
                💡 <strong>Canlı Kamera:</strong> Webcam'den gerçek zamanlı analiz |{" "}
                <strong>Video Yükle:</strong> Önceden kaydedilmiş video analizi
            </div>
        </div>
    );
}
