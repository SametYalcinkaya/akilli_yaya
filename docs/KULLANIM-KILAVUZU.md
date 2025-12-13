# 🚶 Akıllı Yaya Güvenliği Sistemi v2.0

## Sistem Özeti

Bu sistem, canlı video akışlarından (MOBESE, webcam, video dosyaları) yayaları tespit eder, takip eder ve metriklerini hesaplar.

### Temel Özellikler:
- **4 Sınıflı Yaya Tespiti**: Çocuk, Yaşlı, Engelli, Yetişkin
- **Gerçek Zamanlı Tracking**: Her yayaya benzersiz ID atama
- **Metrik Hesaplama**: Hız, yön, ETA, kalan mesafe
- **Risk Değerlendirme**: Geçit bazlı risk analizi
- **Çoklu Video Kaynağı**: HLS, RTSP, webcam, video dosyası desteği

---

## 🚀 Hızlı Başlangıç

### 1. Backend'i Başlat
```bash
cd backend
python -m uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

### 2. Frontend'i Başlat
```bash
cd frontend
npm run dev
```

### 3. Tarayıcıda Aç
```
http://localhost:5173
```

---

## 📡 Video Kaynağı Ekleme

### Bursa MOBESE (HLS)
1. https://www.bursabuyuksehir.tv adresine git
2. İstediğin kamerayı aç (örn: Polis Okulu Kavşağı)
3. Tarayıcı geliştirici araçlarını aç (F12)
4. Network sekmesinde `.m3u8` uzantılı URL'yi bul
5. Bu URL'yi sisteme yapıştır

Örnek URL formatı:
```
https://canliyayin.bursa.bel.tr/cdnlive/polisokulu_720p.stream/chunklist_xxx.m3u8?t=TOKEN&e=EXPIRY
```

### Webcam
- "📷 Webcam" butonuna tıkla
- Otomatik olarak varsayılan webcam eklenir

### Video Dosyası
API üzerinden:
```bash
curl -X POST "http://localhost:8001/api/stream/add-video?file_path=C:/video.mp4&name=Test"
```

---

## 🎯 Kalibrasyon

Doğru mesafe ve hız hesaplaması için kalibrasyon yapılmalı:

1. "🎯 Kalibre Et" butonuna tıkla
2. Yaya geçidinin **başlangıç noktasına** tıkla (yeşil nokta)
3. Yaya geçidinin **bitiş noktasına** tıkla (kırmızı nokta)
4. Yol uzunluğunu metre cinsinden gir (varsayılan: 10m)

---

## 📊 Metrikler Açıklaması

### Her Yaya İçin:
| Metrik | Açıklama |
|--------|----------|
| **ID** | Benzersiz takip numarası |
| **Kategori** | child, elderly, disabled, adult |
| **Hız (m/s, km/h)** | Anlık yürüme hızı |
| **Yön** | north, south, east, west |
| **İlerleme (%)** | Geçitteki konum |
| **Kalan Mesafe** | Geçit sonuna kadar metre |
| **ETA** | Tahmini geçiş süresi (saniye) |
| **Süre** | Geçitte geçirilen süre |

### Geçit Özeti:
| Metrik | Açıklama |
|--------|----------|
| **Risk Seviyesi** | low, medium, high, critical |
| **Toplam Yaya** | Tespit edilen kişi sayısı |
| **Geçiş Yapan** | Aktif olarak geçen sayısı |
| **Ort. Hız** | Ortalama yürüme hızı |
| **Ek Süre** | Önerilen yeşil ışık uzatması |

---

## 🔧 API Endpoints

### Stream Yönetimi
```
POST /api/stream/add          - Yeni kaynak ekle
POST /api/stream/add-webcam   - Webcam ekle
POST /api/stream/start/{id}   - Kaynağı başlat
POST /api/stream/stop/{id}    - Kaynağı durdur
GET  /api/stream/sources      - Tüm kaynakları listele
```

### Kalibrasyon
```
POST /api/calibrate           - Yaya geçidi kalibrasyonu
```

### Sistem
```
GET  /api/status              - Sistem durumu
GET  /api/detector/info       - Model bilgisi
GET  /api/tracker/stats       - Tracking istatistikleri
POST /api/reset-all           - Sistemi sıfırla
```

### WebSocket
```
ws://localhost:8001/ws/video-stream  - Ana video + metrik akışı
ws://localhost:8001/ws/metrics       - Sadece metrikler (hafif)
```

---

## 📁 Dosya Yapısı

```
backend/
├── app.py                    # Ana FastAPI uygulaması
├── stream_handler.py         # Video kaynak yönetimi
├── pedestrian_detector.py    # YOLO tespit motoru
├── pedestrian_tracker.py     # Tracking sistemi
├── metrics_calculator.py     # Metrik hesaplamaları
└── models/                   # Model dosyaları

frontend/
└── src/
    └── App.jsx               # Ana React bileşeni
```

---

## 🎨 Kategori Renkleri

| Kategori | Emoji | Renk | Ek Süre |
|----------|-------|------|---------|
| Yetişkin | 🚶 | Mavi | 0s |
| Yaşlı | 👴 | Mor | +5s |
| Çocuk | 👶 | Kırmızı | +4s |
| Engelli | ♿ | Turuncu | +7s |

---

## ⚠️ Önemli Notlar

1. **MOBESE Token Süresi**: HLS URL'leri token içerir ve belirli süre sonra geçersiz olur. Yeni token almak için sayfayı yenileyin.

2. **Model Performansı**: GPU varsa otomatik kullanılır. CPU'da da çalışır ama daha yavaş.

3. **Kalibrasyon**: Her kamera açısı için ayrı kalibrasyon yapın. Yanlış kalibrasyon hız/mesafe hesaplamalarını bozar.

4. **WebSocket Bağlantısı**: Bağlantı kesilirse otomatik yeniden bağlanma denenir (3 saniye aralıklarla).

---

## 🐛 Sorun Giderme

### Backend başlamıyor
```bash
# Modülleri kontrol et
python -c "from app import app; print('OK')"

# Port kullanımda mı?
netstat -an | findstr 8001
```

### Video akışı gelmiyor
1. Kaynak URL'sini kontrol et
2. "🔄 Yenile" butonuna tıkla
3. Tarayıcı konsolunu kontrol et (F12)

### Model yüklenmiyor
```bash
# Model dosyasını kontrol et
ls runs/detect/akilli_yaya_mvp/weights/best.pt
```

---

## 📈 Gelecek Özellikler

- [ ] Trafik ışığı entegrasyonu
- [ ] Çoklu kamera görünümü
- [ ] Geçmiş veri kaydı
- [ ] Alarm sistemi
- [ ] Mobil arayüz
