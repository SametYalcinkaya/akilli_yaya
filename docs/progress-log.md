# Akıllı Yaya Güvenliği - İlerleme Günlüğü

Her adımı tarih/saat ile not edin. Yeni kayıtları bu dosyanın en üstüne ekleyin (ters kronolojik).

## 2025-12-07
- Veri durumu: `datasets/processed/pedestrians/` içinde toplam 5154 label dosyası; sınıf bazında instance sayıları elderly 946, child 2181, disabled 1740, adult 11940 (train/val/test 70/20/10 korunuyor).
- Eğitim: CPU ile YOLOv8n 10 epoch (cmd: `yolo detect train data=datasets/processed/pedestrians/data.yaml model=yolov8n.pt imgsz=640 epochs=10 batch=16 name=akilli_yaya_mvp`). Sonuçlar (best.pt): Precision 0.909, Recall 0.840, mAP50 0.905, mAP50-95 0.628; sınıf mAP50: elderly 0.770, child 0.948, disabled 0.967, adult 0.936.
- Çıktılar: `runs/detect/akilli_yaya_mvp/weights/{best,last}.pt` (optimizer strip). Henüz 50 epoch uzatma yapılmadı; onay bekleniyor.
- Not: Elderly örnekleri az ve dengesiz; daha çok elderly/engelli görüntüsü ve/veya augmentasyon ile recall iyileştirilebilir.

## 2025-12-06 (Later PM)
- YOLO entegrasyonu: `DetectionEngine` lazy-load yapıyor; `backend/models/yolov8n.pt` varsa gerçek person tespiti, yoksa stub’a düşüyor.
- Model indirme yardımcısı: `backend/download_model.py` eklendi; `yolov8n.pt` dosyasını `backend/models/` altına indirir.
- Kamera entegrasyonu başlangıcı: `CameraHandler` OpenCV ile webcam/video okuyor; yoksa stub kare üretip base64 encode ediyor. Frame yüksekliği tracking’e aktarılıyor.
- WS video payload now includes `frame_shape`, frontend overlay gerçek bbox koordinatlarına göre yüzdeyle çiziyor.
- Kategori heuristiği: `DetectionEngine` bbox boy/oranından çocuk/engelli/yaşlı/adult kaba tahmin yapıyor (gerçek model eklenene kadar).
- Tracking: zaman damgası ile hız hesaplıyor, yol uzunluğu 8m varsayımıyla m/s çıkartıyor.
- Trafik sim: `TrafficController` aktif yön, geri sayım ve otomatik rotasyon ekledi; `apply_extension` mevcut yeşili uzatıyor, `tick` zamanla geriye sayıyor.
- Kalibrasyon çizgileri WS payload’a eklendi, frontend video overlay’de çizgi çiziyor.
- Trafik panelinde aktif yön vurgusu ve canlı geri sayım stili eklendi.

## 2025-12-06 (PM)
- Demo akış iyileştirmesi: `CameraHandler` stub kare üretip base64 olarak gönderiyor.
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