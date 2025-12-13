import { useRef, useState } from "react";
import { Camera, Upload, StopCircle, RotateCcw, Activity } from "lucide-react";

const API_BASE = import.meta.env.VITE_BACKEND_API || "http://localhost:8001";

export function ControlPanel({ onVideoUploaded }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");

    // Kamera başlat
    const startCamera = async () => {
        try {
            setStatus("Kamera başlatılıyor...");
            const res = await fetch(`${API_BASE}/api/stream/add-webcam?device_id=0&name=Webcam`, { method: "POST" });
            const data = await res.json();
            
            // Stream'i başlat
            if (data.source_id) {
                await fetch(`${API_BASE}/api/stream/start/${data.source_id}`, { method: "POST" });
                if (onVideoUploaded) onVideoUploaded(data);
            }
            
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
            
            // Stream'i başlat
            if (data.source_id) {
                await fetch(`${API_BASE}/api/stream/start/${data.source_id}`, { method: "POST" });
                if (onVideoUploaded) onVideoUploaded(data);
            }
            
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
            await fetch(`${API_BASE}/api/stream/stop-all`, { method: "POST" });
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
        <div className="glass-panel p-4 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-slate-300 mb-2">
                <Activity size={18} className="text-brand-primary" />
                <h3 className="font-semibold text-sm uppercase tracking-wider">Kontrol Paneli</h3>
            </div>

            {/* Ana kontroller */}
            <div className="grid grid-cols-2 gap-3">
                {/* Kamera Başlat */}
                <button
                    onClick={startCamera}
                    className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-4 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-600/30 hover:border-emerald-500/50 transition-all duration-200 group"
                >
                    <Camera size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Canlı Kamera</span>
                </button>

                {/* Video Yükle */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600/20 border border-blue-500/30 px-4 py-3 text-sm font-medium text-blue-400 hover:bg-blue-600/30 hover:border-blue-500/50 transition-all duration-200 group disabled:opacity-50"
                >
                    <Upload size={18} className="group-hover:scale-110 transition-transform" />
                    <span>{uploading ? "Yükleniyor..." : "Video Yükle"}</span>
                </button>

                {/* Durdur */}
                <button
                    onClick={stopStream}
                    className="flex items-center justify-center gap-2 rounded-lg bg-amber-600/20 border border-amber-500/30 px-4 py-3 text-sm font-medium text-amber-400 hover:bg-amber-600/30 hover:border-amber-500/50 transition-all duration-200 group"
                >
                    <StopCircle size={18} className="group-hover:scale-110 transition-transform" />
                    <span>Durdur</span>
                </button>

                {/* Reset */}
                <button
                    onClick={resetSystem}
                    className="flex items-center justify-center gap-2 rounded-lg bg-slate-700/30 border border-slate-600/30 px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-700/50 hover:border-slate-500/50 transition-all duration-200 group"
                >
                    <RotateCcw size={18} className="group-hover:-rotate-180 transition-transform duration-500" />
                    <span>Sıfırla</span>
                </button>
            </div>

            {/* Durum göstergesi */}
            {status && (
                <div className="fade-in flex items-center gap-2 text-sm text-slate-300 bg-slate-800/80 border border-slate-700 rounded-lg px-4 py-3">
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></div>
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
            <div className="text-xs text-slate-500 px-1">
                <p className="mb-1">💡 <strong>Canlı Kamera:</strong> Webcam analizi başlatır.</p>
                <p>💡 <strong>Video Yükle:</strong> Kayıtlı video dosyasını analiz eder.</p>
            </div>
        </div>
    );
}
