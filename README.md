# Akıllı Yaya Güvenliği MVP

Görüntü tabanlı yaya geçidi güvenliği için FastAPI + YOLOv8 arka uç ve React/Tailwind ön yüz prototipi. Gerçek zamanlı tespit, hız/konum tahmini ve dinamik trafik ışığı süresi simülasyonu içerir (demoda stub verilerle çalışır).

## Özellikler
- FastAPI backend: kalibrasyon, başlat/durdur/reset REST uçları; canlı video ve trafik durumu için WebSocket stub akışları.
- YOLOv8 entegrasyonu için hazırlıklı tespit/izleme/süre hesaplama modülleri (şu an placeholder mantık).
- React + Tailwind panel: canlı akış placeholder overlay, metrik kartları, kontrol butonları, kavşak/ışık simülasyonu.
- CORS açık; WebSocket endpoint’leri ön tanımlı.

## Dizim
```
backend/        # FastAPI app ve modüller
frontend/       # Vite + React + Tailwind arayüz
mvp.md          # Ayrıntılı MVP PRD
requirements.txt
```

## Hızlı Başlangıç
> PowerShell komutları aşağıdadır.

### 1) Backend
```powershell
cd "c:\Users\samet\Documents\GitHub\akilli_yaya"
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 2) Frontend
```powershell
cd "c:\Users\samet\Documents\GitHub\akilli_yaya\frontend"
npm install
# Gerekirse backend WS adresi
$env:VITE_BACKEND_WS="ws://localhost:8000"
npm run dev
```
Frontend varsayılan olarak `http://localhost:5173`’te açılır.

## API / WebSocket Uçları
- `POST /api/calibrate` — {start_line: [x,y], end_line: [x,y]}
- `POST /api/start`, `POST /api/stop`, `POST /api/reset`
- `GET  /api/status`
- `WS /ws/video-stream` — frame/detections/metrics (stub)
- `WS /ws/traffic-state` — ışık durumları (stub)

## Yapılacaklar (özet)
- YOLOv8 model yükleme ve gerçek çerçeve işleme
- WebSocket’te base64 frame gönderimi ve overlay çizimleri
- Hız/mesafe kalibrasyonu, tracking iyileştirmesi
- Demo videoları ile performans testleri ve UI polish

## Lisans
Belirtilmedi (varsayılan olarak tüm hakları saklıdır). Gerektiğinde LICENSE ekleyin.
