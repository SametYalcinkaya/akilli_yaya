# Akilli Yaya Guvenligi MVP

Goruntu tabanli yaya gecidi guvenligi icin FastAPI + YOLOv8 arka uc ve React/Tailwind on yuz prototipi. Gercek zamanli tespit, hiz/konum tahmini ve dinamik trafik isigi suresi simulasyonu icerir.

## Ozellikler
- **YOLOv8 Tabanli 4 Sinifli Tespit**: Yasli, cocuk, engelli ve yetiskin kategorileri
- FastAPI backend: kalibrasyon, baslat/durdur/reset REST uclari; canli video ve trafik durumu icin WebSocket akislari
- React + Tailwind panel: canli akis overlay, metrik kartlari, kontrol butonlari, kavsak/isik simulasyonu
- MOBESE ve HLS stream destegi (Bursa Belediyesi kameralari)
- CORS acik; WebSocket endpoint'leri on tanimli

## Model Bilgisi
Egitilmis model: `runs/train/ai2_balanced_v1/weights/best.pt`
- **Siniflar**: child (cocuk), elderly (yasli), disabled (engelli), adult (yetiskin)
- **mAP50**: 0.905 | **Precision**: 0.909 | **Recall**: 0.840

## Dizin Yapisi
```
backend/        # FastAPI app ve moduller
frontend/       # Vite + React + Tailwind arayuz
runs/           # Egitilmis modeller
docs/           # Dokumantasyon
scripts/        # Yardimci scriptler
```

## Hizli Baslangic

### 1) Backend
```powershell
cd "c:\Users\mikai\OneDrive\Belgeler\GitHub\akilli_yaya"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
cd backend
uvicorn app:app --reload --host 0.0.0.0 --port 8001
```

### 2) Frontend
```powershell
cd "c:\Users\mikai\OneDrive\Belgeler\GitHub\akilli_yaya\frontend"
npm install
npm run dev
```
Frontend varsayilan olarak `http://localhost:5173`'te acilir.

## API / WebSocket Uclari
- `POST /api/calibrate` - {start_point: [x,y], end_point: [x,y], road_length_m: float}
- `POST /api/stream/add-webcam` - Webcam ekle
- `POST /api/stream/start/{source_id}` - Stream baslat
- `GET  /api/status` - Sistem durumu
- `GET  /api/detector/info` - Model bilgileri
- `WS /ws/video-stream` - frame/detections/metrics
- `WS /ws/metrics` - sadece metrikler (hafif)

## Environment Degiskenleri
`.env.example` dosyasini `.env` olarak kopyalayin ve duzenleyin.

Frontend icin `frontend/.env` dosyasini olusturun:
```
VITE_BACKEND_HOST=localhost:8001
```

## Lisans
Belirtilmedi (varsayilan olarak tum haklari saklidir). Gerektiginde LICENSE ekleyin.
