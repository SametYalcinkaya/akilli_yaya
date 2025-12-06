# Akıllı Yaya Güvenliği - İlerleme Günlüğü

Her adımı tarih/saat ile not edin. Yeni kayıtları bu dosyanın en üstüne ekleyin (ters kronolojik).

## 2025-12-06 (PM)
- Demo akış iyileştirmesi: `CameraHandler` artık Pillow ile stub kare üretip base64 olarak gönderiyor.
- `DetectionEngine` demo amaçlı hareketli bbox ve kategori fazı ekledi; `TrackingSystem` 360px yüksekliğe göre konum hesaplıyor.
- `main.py` WebSocket çıktısına base64 frame, senkronize ışık güncellemesi ve metrikler eklendi.
- Frontend `VideoDisplay` base64 frame render ediyor; `App.jsx` frame prop’u geçiyor.

## 2025-12-06
- Yeni repo oluşturuldu ve `main`e pushlandı (`https://github.com/SametYalcinkaya/akilli_yaya`).
- Backend FastAPI iskeleti eklendi: `main.py` (CORS, REST start/stop/reset/status, WS stub akışları), modüller (`camera_handler.py`, `detection_engine.py`, `tracking_system.py`, `decision_algorithm.py`, `traffic_controller.py`).
- Frontend Vite + React + Tailwind iskeleti eklendi: `App.jsx` (sol canlı analiz, sağ trafik sim), bileşenler (`VideoDisplay`, `MetricsCards`, `ControlPanel`, `IntersectionMap`, `TrafficLight`, `StatusBadge`), `useWebSocket` hook.
- `requirements.txt` ve frontend `package.json`/Tailwind yapılandırmaları yazıldı.
- `README.md` oluşturuldu (kurulum, uçlar, TODO özet).
- `mvp.md` inceleme: PRD/MVP kapsamı referans alındı, ancak model/YOLO entegrasyonu şimdilik stub.

### Notlar / Açık İşler
- YOLOv8 model entegrasyonu, gerçek kamera/video beslemesi ve base64 frame gönderimi yapılacak.
- Tracking hız/mesafe kalibrasyonu geliştirilecek; WebSocket mesaj şeması netleşecek.
- Demo videoları ve performans testleri hazırlanacak.
