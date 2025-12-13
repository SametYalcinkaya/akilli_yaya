 # Akıllı Yaya Güvenliği Sistemi - MVP Planı
## Product Requirements Document (PRD)

**Proje Adı:** Akıllı Yaya Güvenliği - Görüntü Tabanlı Işık Süresi Uyarlama Sistemi  
**Versiyon:** MVP 1.0 (Jüri Demo Versiyonu)  
**Hedef:** Naim Süleymanoğlu Bulvarı için prototip sistemin yapılabilirliğini kanıtlamak  
**Tarih:** Aralık 2024

---

## 1. EXECUTIVE SUMMARY

### 1.1 Problem Tanımı
Yaya geçitlerinde yaşlı, hamile, engelli ve çocukların sabit süreli trafik ışıkları nedeniyle yolun ortasında kalması ciddi güvenlik riski oluşturuyor. Bu durum hem yayalar için hayati tehlike, hem sürücüler için ani fren/kaza riski yaratıyor.

### 1.2 Çözüm Özeti
Yapay zeka destekli görüntü işleme sistemi ile yaya geçitlerini gerçek zamanlı izleyerek:
- Yayaların kategorisini tespit etme (yaşlı, çocuk, engelli)
- Yoldaki konumunu ve hızını ölçme
- Geçiş için gereken süreyi dinamik hesaplama
- Trafik ışıklarını otomatik senkronize etme

### 1.3 MVP Kapsamı
Bu MVP, jüri sunumu için sisteminizin **çalışır bir prototipini** gösterecek. Gerçek donanım entegrasyonu içermez, ancak tüm akıllı karar mekanizmalarını simüle eder.

---

## 2. MVP ÖZELLİKLERİ

### 2.1 Temel Özellikler (Must-Have)

#### A. Görüntü İşleme Modülü
- [x] Webcam'den canlı video akışı
- [x] YOLOv8 tabanlı insan tespiti
- [x] Kategori sınıflandırması (yaşlı, çocuk, engelli, normal yetişkin)
- [x] Yol başlangıç/bitiş çizgilerini manuel belirleme (kurulum)
- [x] Kişinin yoldaki konumunu hesaplama (%)
- [x] Hareket hızı tespiti (piksel/saniye → metre/saniye)

#### B. Karar Algoritması
- [x] Kişi kategorisine göre ek süre hesaplama
  - Yaşlı: +5 saniye
  - Çocuk: +4 saniye
  - Engelli (tekerlekli sandalye): +7 saniye
  - Hamile/yavaş yürüyen: +6 saniye
- [x] Kalan mesafe ve hıza göre dinamik süre hesaplama
- [x] Çoklu kişi senaryosu (en yavaş kişiye göre ayarlama)
- [x] Minimum yeşil ışık süresi garantisi (10 saniye)

#### C. Web Panel (Split-Screen)

**Sol Panel - Canlı Analiz (60%)**
- Webcam görüntüsü (real-time)
- Tespit edilen kişiler üzerinde bounding box ve etiket
- Yol çizgileri (yeşil çizgiler)
- Anlık metrikler kartları:
  - Tespit edilen kişi sayısı
  - Kategori dağılımı
  - En kritik kişi (en yavaş/en uzak)
  - Hesaplanan ek süre

**Sağ Panel - Trafik Simülasyonu (40%)**
- 4 yönlü kavşak haritası (top-down view)
- Her yön için:
  - Araç ışığı (kırmızı/sarı/yeşil)
  - Yaya ışığı (kırmızı/yeşil)
  - Geri sayım sayacı
- Senkronizasyon durumu göstergesi
- Süre uzatma animasyonu (flash efekti)

#### D. Kontrol ve Kurulum
- Webcam seçimi (birden fazla kamera varsa)
- Yol çizgilerini belirleme (2 nokta tıklama)
- Video dosyası yükleme/oynatma seçeneği
- Başlat/Durdur/Reset kontrolleri
- Sistem durumu göstergesi

### 2.2 Teknik Gereksinimler

#### Yazılım Stack
```
Backend:
- Python 3.10+
- FastAPI (WebSocket desteği ile)
- OpenCV (cv2)
- Ultralytics YOLOv8
- NumPy, Pillow

Frontend:
- React 18 (Vite)
- TailwindCSS
- Recharts (grafikler için)
- WebSocket client

AI/ML:
- YOLOv8n (nano - hız için)
- Custom classification model (fine-tuned)
```

#### Donanım Gereksinimleri
- Webcam (minimum 720p, 30fps)
- Laptop/PC (minimum):
  - RAM: 8GB
  - CPU: i5 veya üzeri (GPU opsiyonel ama önerilir)
  - OS: Windows 10/11, macOS, Linux

#### Performans Hedefleri
- FPS: Minimum 15, hedef 25-30
- Tespit doğruluğu: %85+
- Gecikme: Maksimum 200ms (tespit → karar)
- Eşzamanlı kişi sayısı: 10'a kadar

---

## 3. KULLANICI HİKAYELERİ

### 3.1 Jüri Üyesi (Demo İzleyici)
**Hedef:** Sistemin gerçek hayatta çalışabileceğine inanmak

**Senaryo:**
1. Ekranda canlı yaya geçidi görüntüsü görüyorum
2. Yaşlı bir kişi yola girdiğinde sistem onu tespit ediyor
3. Kişi yavaş yürüyor ve yolun %40'ında
4. Sağ panelde yeşil ışığın 5 saniye uzadığını görüyorum
5. Tüm kavşak ışıklarının senkronize olduğunu görüyorum
6. "Bu gerçek hayatta işe yarar" diyorum

### 3.2 Sunum Yapan Takım Üyesi
**Hedef:** Sistemi akıcı şekilde demo yapmak

**Senaryo:**
1. Sistemi başlatıyorum (1 tık)
2. Webcam'i hazır videonun oynatıldığı ekrana çeviriyorum
3. Video başlıyor, sistem otomatik tespit yapıyor
4. Metrikleri jüriye gösteriyorum
5. Kritik an: "İşte yaşlı tespit edildi!" diyorum
6. Işık uzaması gerçekleşiyor, jüri alkışlıyor

---

## 4. GELIŞTIRME FAZLARI

### FAZA 1: Veri Seti ve Model (1 hafta)

#### Adım 1.1: Veri Seti Bulma ve Hazırlama
**Hedef veri setleri:**
1. **Yaşlı tespit:**
   - Kaggle: "Elderly Person Detection Dataset"
   - Roboflow: "Age Classification Dataset"
   - Anahtar kelimeler: cane, walker, slow walking

2. **Çocuk tespit:**
   - COCO Dataset (person class - height filtering)
   - Roboflow: "Child Detection Dataset"
   - Anahtar: height/width ratio < 0.6

3. **Engelli tespit:**
   - Roboflow: "Wheelchair Detection"
   - Kaggle: "Mobility Aid Detection"
   - Anahtar: wheelchair, crutches

4. **Genel pedestrian:**
   - COCO Person class
   - CityScapes pedestrian

**Aksiyon itemleri:**
- [ ] En az 500 görüntü/kategori topla
- [ ] YOLO formatında etiketle (labelImg veya Roboflow)
- [ ] Train/Val/Test split: 70/20/10
- [ ] Data augmentation (flip, rotate, brightness)

#### Adım 1.2: Model Eğitimi
```python
# Eğitim stratejisi
1. YOLOv8n base model ile başla (pre-trained COCO)
2. Custom veri seti ile fine-tune et
3. Classes: ['elderly', 'child', 'disabled', 'adult']
4. Hyperparameters:
   - Epochs: 50-100
   - Batch: 16
   - Image size: 640
   - Learning rate: 0.001
```

**Başarı kriterleri:**
- mAP@0.5: > 0.80
- Inference time: < 50ms/frame
- False positive rate: < %15

#### Adım 1.3: Model Test ve İyileştirme
- [ ] Çeşitli ışık koşullarında test
- [ ] Farklı açılardan test
- [ ] Edge case'leri tanımla (örn: yağmurlu hava)
- [ ] Model quantization (hız için)

---

### FAZA 2: Backend Geliştirme (1 hafta)

#### Adım 2.1: Proje Yapısı
```
smart-pedestrian-system/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── camera_handler.py       # Webcam/video input
│   ├── detection_engine.py     # YOLO inference
│   ├── tracking_system.py      # Multi-object tracking
│   ├── decision_algorithm.py   # Süre hesaplama
│   ├── traffic_controller.py   # Işık simülasyonu
│   └── models/
│       └── best.pt             # Eğitilmiş model
├── frontend/
│   └── (React app)
├── datasets/
├── tests/
└── requirements.txt
```

#### Adım 2.2: Core Modüller

**camera_handler.py**
```python
class CameraHandler:
    - open_webcam(device_id)
    - load_video(file_path)
    - get_frame()
    - set_calibration_lines(start_line, end_line)
    - calculate_real_distance(pixel_distance)
```

**detection_engine.py**
```python
class DetectionEngine:
    - load_model(model_path)
    - detect_persons(frame)
    - classify_category(bbox, frame)
    - get_bounding_boxes()
```

**tracking_system.py**
```python
class TrackingSystem:
    - update_tracks(detections)
    - calculate_position(bbox, calibration_lines)
    - estimate_speed(track_history)
    - get_critical_person()  # En riskli kişi
```

**decision_algorithm.py**
```python
class DecisionAlgorithm:
    BASE_TIMES = {
        'elderly': 5,
        'child': 4,
        'disabled': 7,
        'pregnant': 6,
        'adult': 0
    }
    
    - calculate_required_time(person_data)
    - predict_crossing_time(speed, distance)
    - get_extension_time()
```

**traffic_controller.py**
```python
class TrafficController:
    - initialize_intersection(4-way)
    - update_light_state(direction, color, duration)
    - synchronize_lights(extended_time)
    - get_current_state()
```

#### Adım 2.3: WebSocket API
```python
# Endpoints
WS /ws/video-stream
    → Sends: frame (base64), detections, metrics
    
WS /ws/traffic-state
    → Sends: light states, countdown, sync status

POST /api/calibrate
    → Body: {start_line: [x,y], end_line: [x,y]}

POST /api/start
POST /api/stop
POST /api/reset
GET /api/status
```

---

### FAZA 3: Frontend Geliştirme (4-5 gün)

#### Adım 3.1: Component Yapısı
```
src/
├── App.jsx
├── components/
│   ├── LeftPanel/
│   │   ├── VideoDisplay.jsx        # Webcam + overlay
│   │   ├── MetricsCards.jsx        # Anlık istatistikler
│   │   ├── ControlPanel.jsx        # Butonlar
│   │   └── CalibrationTool.jsx     # Çizgi çizme
│   ├── RightPanel/
│   │   ├── IntersectionMap.jsx     # Kavşak görünümü
│   │   ├── TrafficLight.jsx        # Tek ışık komponenti
│   │   ├── CountdownTimer.jsx      # Geri sayım
│   │   └── SyncIndicator.jsx       # Senkron animasyon
│   └── shared/
│       ├── StatusBadge.jsx
│       └── AlertBox.jsx
└── hooks/
    ├── useWebSocket.js
    └── useVideoStream.js
```

#### Adım 3.2: Temel Özellikler

**VideoDisplay Component:**
- Canvas üzerinde video rendering
- Bounding box çizimi (kategori renkli)
- Yol çizgileri (yeşil, kesikli)
- Konum ve hız etiketleri
- Smooth 30fps animasyon

**MetricsCards:**
```jsx
<div className="grid grid-cols-2 gap-4">
  <MetricCard 
    title="Tespit Edilen" 
    value={detectedCount}
    icon={<Users />}
  />
  <MetricCard 
    title="Kritik Durum" 
    value={criticalPerson?.category}
    color="red"
  />
  <MetricCard 
    title="Ek Süre" 
    value={`+${extensionTime}s`}
    trend="up"
  />
  <MetricCard 
    title="Konum" 
    value={`%${position}`}
  />
</div>
```

**IntersectionMap:**
- SVG tabanlı 4 yönlü kavşak
- Her yönde araç ve yaya ışığı
- Aktif geçidi vurgulama (pulse efekt)
- Süre uzatma animasyonu (glow)

#### Adım 3.3: UI/UX Detayları
- Karanlık tema (modern ve profesyonel)
- Yeşil vurgu rengi (güvenlik teması)
- Büyük, okunabilir fontlar (jüri uzaktan görecek)
- Anlık feedback (toast bildirimleri)
- Loading states ve error handling

---

### FAZA 4: Entegrasyon ve Test (3-4 gün)

#### Adım 4.1: Sistem Entegrasyonu
- [ ] Backend ve frontend bağlantısı
- [ ] WebSocket mesaj formatı standardizasyonu
- [ ] Error handling ve reconnection logic
- [ ] Performans optimizasyonu

#### Adım 4.2: Test Senaryoları

**Senaryo 1: Tek Yaşlı Kişi**
- Video: Yaşlı kişi yavaşça geçiyor
- Beklenen: +5 saniye, başarılı geçiş
- Sonuç: ✓ Pass / ✗ Fail

**Senaryo 2: Çocuk Koşarak Geçiyor**
- Video: Çocuk hızlı hareket
- Beklenen: +4 saniye ama erken bitiriyor
- Sonuç: Sistem erken kesme yapmalı

**Senaryo 3: Tekerlekli Sandalye**
- Video: Engelli kişi yavaş ilerliyor
- Beklenen: +7 saniye
- Sonuç: En uzun süre garantisi

**Senaryo 4: Kalabalık Grup**
- Video: 5 kişi, içinde 1 yaşlı
- Beklenen: En yavaş kişiye göre ayarlama
- Sonuç: Grup geçene kadar yeşil

**Senaryo 5: Yanlış Tespit (False Positive)**
- Video: Ağaç gölgesi, hayvan
- Beklenen: Tespit edilmemeli
- Sonuç: Confidence threshold test

#### Adım 4.3: Demo Videoları Hazırlama
- [ ] 5 farklı senaryo için video kaydet (30-60 saniye)
- [ ] Farklı ışık koşulları (gündüz, akşam)
- [ ] Farklı hava durumları (güneşli, bulutlu)
- [ ] Yedek video setleri (teknik sorun için)

#### Adım 4.4: Performans Testleri
```python
# Benchmark metrikleri
- Frame processing time: < 50ms
- Detection accuracy: > 85%
- Tracking stability: > 90% (ID consistency)
- UI responsiveness: < 100ms lag
- Memory usage: < 2GB
- CPU usage: < 70% (tek core)
```

---

### FAZA 5: Jüri Sunumu Hazırlığı (2-3 gün)

#### Adım 5.1: Sunum Materyalleri
**Fiziksel Kurulum:**
- [ ] Laptop (fully charged + şarj aleti)
- [ ] Webcam (tripod veya stand)
- [ ] Yedek laptop/tablet (backup)
- [ ] HDMI kablo (projeksiyon için)
- [ ] Mouse (sunum kontrolü)
- [ ] Demo videoları USB'de yedek

**Dijital Hazırlık:**
- [ ] Sistemi 3 kez kurulum testi yap
- [ ] Offline çalışabilir hale getir (internet bağımlılığı yok)
- [ ] Demo videolarını lokal kaydet
- [ ] Dummy data ile test et
- [ ] Crash recovery senaryosu hazırla

#### Adım 5.2: Sunum Akışı (5-7 dakika)

**Dakika 0-1: Giriş**
- Problemi özetleme
- İstatistik paylaşma (kaza verileri)
- Çözümü tanıtma

**Dakika 1-2: Sistem Mimarisi**
- Kısa teknik açıklama
- Nasıl çalıştığını anlatma
- AI modelini tanıtma

**Dakika 2-5: Canlı Demo**
1. "Şimdi sistemi başlatıyorum"
2. Webcam görünümünü göster
3. Video oynatsın (veya canlı demo)
4. İlk tespit: "Bakın, yaşlı bir yaya tespit edildi"
5. Metrikler: "Yolun %35'inde, yavaş yürüyor"
6. Karar: "Sistem +5 saniye hesapladı"
7. Işıklar: "Tüm kavşak senkronize edildi"
8. Sonuç: "Yaya güvenli geçti"

**Dakika 5-7: Sonuç ve Vizyon**
- MVP başarısını vurgula
- Gerçek hayat potansiyelini anlat
- Bursa'da pilot uygulama hedefi
- Akıllı şehir vizyonu
- Sorular

#### Adım 5.3: Olası Sorular ve Cevaplar

**S: Yanlış tespit oranı nedir?**
C: Mevcut modelimiz %85+ doğruluk. Gerçek uygulamada çoklu kamera ve sensör füzyonu ile %95+ hedefliyoruz.

**S: Gece görüş nasıl?**
C: MVP gündüz için optimize. Production'da IR kameralar ve gece modu eklenecek.

**S: Maliyet?**
C: Edge AI kamera: ~$200, kontrolcü: ~$100. Geleneksel sistemlere %30 ek maliyet, ama kaza azalması ROI'yi 1 yılda karşılar.

**S: Veri gizliliği (KVKK)?**
C: Görüntü lokal işlenir, yüz tanıma yok, anonim metrik. KVKK compliant tasarım.

**S: Şehir geneline yaygınlaştırma?**
C: Modüler tasarım. Her kavşak bağımsız çalışabilir, ama merkezi yönetim opsiyonel.

**S: Diğer şehirlere adapte?**
C: Evet! Model transfer learning ile 1-2 hafta adaptasyon.

---

## 5. BAŞARI KRİTERLERİ

### 5.1 Teknik Metrikler
- [x] Sistem 30+ dakika kesintisiz çalışıyor
- [x] FPS > 20 (smooth görüntü)
- [x] Tespit doğruluğu > %85
- [x] Karar verme süresi < 300ms
- [x] UI responsive (lag yok)

### 5.2 Demo Başarısı
- [x] 5 senaryonun hepsi başarılı
- [x] Jüri "wow" anı yaşadı
- [x] Teknik problem olmadı
- [x] Sorulara tatmin edici cevaplar verildi
- [x] Sunum 7 dakikayı aşmadı

### 5.3 Jüri İzlenimi (Hedef Tepkiler)
- "Bu gerçekten işe yarayabilir"
- "Teknik olarak sağlam"
- "Sosyal etkisi yüksek"
- "Ölçeklenebilir görünüyor"
- "Bursa için uygun"

---

## 6. RİSKLER VE ÇÖZÜMLER

### 6.1 Yüksek Riskler

**Risk 1: Model yeterince doğru çalışmıyor**
- Olasılık: Orta
- Etki: Yüksek
- Çözüm: Pre-trained modellere fall-back, güven eşiği düşürme, çoklu model ensemble

**Risk 2: Webcam video kalitesi düşük**
- Olasılık: Orta
- Etki: Orta
- Çözüm: Yedek kamera, ön kaydedilmiş HD videolar, lighting test

**Risk 3: Laptop performans sorunu**
- Olasılık: Düşük
- Etki: Yüksek
- Çözüm: Model quantization, batch size düşürme, yedek laptop

**Risk 4: Demo sırasında crash**
- Olasılık: Düşük
- Etki: Kritik
- Çözüm: Exception handling, auto-restart, backup video presentation

### 6.2 Orta Riskler

**Risk 5: Jüri teknik detay soruyor**
- Çözüm: Detaylı FAQ hazırla, "pilot aşama" kartını oyna

**Risk 6: İnternet bağlantısı kesildi**
- Çözüm: Tamamen offline çalışır yap

**Risk 7: Projeksiyon çözünürlüğü düşük**
- Çözüm: Büyük font ve kontrastlı renk kullan

---

## 7. ZAMAN ÇİZELGESİ

### Hafta 1: Veri ve Model (7 gün)
- Gün 1-2: Veri seti toplama ve etiketleme
- Gün 3-5: Model eğitimi ve optimizasyon
- Gün 6-7: Model test ve fine-tuning

### Hafta 2: Backend (7 gün)
- Gün 8-9: Proje yapısı ve core modüller
- Gün 10-11: Tracking ve karar algoritması
- Gün 12-14: API ve WebSocket entegrasyonu

### Hafta 3: Frontend (7 gün)
- Gün 15-16: Component geliştirme
- Gün 17-18: UI/UX polish
- Gün 19-21: Backend-frontend entegrasyon

### Hafta 4: Test ve Sunum (7 gün)
- Gün 22-24: End-to-end testler
- Gün 25-26: Demo videoları ve sunum hazırlık
- Gün 27-28: Prova ve son testler

**TOPLAM: 4 hafta (28 gün)**

---

## 8. SONRAKI ADIMLAR (Post-MVP)

### Faza 6: Pilot Uygulama
- Gerçek edge AI kamera entegrasyonu
- Bursa Belediyesi ile pilot kavşak seçimi
- Trafik ışığı donanım entegrasyonu
- 3 ay beta test

### Faza 7: Ölçeklendirme
- Multi-camera fusion
- Cloud-based merkezi yönetim
- Analytics dashboard (belediye için)
- Mobile app (vatandaş bildirimleri)

### Faza 8: Akıllı Şehir Entegrasyonu
- Diğer traffic sistemleriyle entegrasyon
- IoT sensörler (hava durumu, yoğunluk)
- Predictive analytics
- Şehir geneli deployment

---

## 9. EKLER

### 9.1 Teknik Mimari Diyagram
```
┌─────────────────────────────────────────────────────────┐
│                    WEB INTERFACE                        │
│  ┌──────────────────────┐  ┌──────────────────────┐   │
│  │   Left Panel         │  │   Right Panel        │   │
│  │  - Video Display     │  │  - Intersection Map  │   │
│  │  - Metrics Cards     │  │  - Traffic Lights    │   │
│  │  - Control Panel     │  │  - Sync Indicator    │   │
│  └──────────────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                         │
                    WebSocket
                         │
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (FastAPI)                      │
│  ┌────────────────────────────────────────────────┐    │
│  │          Camera Handler                        │    │
│  │   (Webcam / Video Input)                       │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────┐    │
│  │       Detection Engine (YOLOv8)                │    │
│  │   - Person Detection                           │    │
│  │   - Category Classification                    │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────┐    │
│  │         Tracking System                        │    │
│  │   - Multi-object Tracking                      │    │
│  │   - Position & Speed Calculation               │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────┐    │
│  │       Decision Algorithm                       │    │
│  │   - Time Calculation                           │    │
│  │   - Risk Assessment                            │    │
│  └─────────────────┬──────────────────────────────┘    │
│                    │                                     │
│  ┌─────────────────▼──────────────────────────────┐    │
│  │       Traffic Controller                       │    │
│  │   - Light State Management                     │    │
│  │   - Synchronization Logic                      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 9.2 Veri Akış Diyagramı
```
[Webcam] → [Frame Capture] → [YOLOv8 Detection] 
    ↓
[Bounding Boxes + Categories] → [Tracking System]
    ↓
[Position + Speed] → [Decision Algorithm]
    ↓
[Required Extension Time] → [Traffic Controller]
    ↓
[Light States] → [WebSocket] → [UI Update]
```

### 9.3 Karar Algoritması Pseudocode
```python
def calculate_extension_time(persons):
    if not persons:
        return 0
    
    critical_person = find_slowest_person(persons)
    
    # Base time by category
    base_extension = BASE_TIMES[critical_person.category]
    
    # Calculate remaining distance
    distance_remaining = ROAD_LENGTH * (1 - critical_person.position_percent)
    
    # Estimate time needed
    time_needed = distance_remaining / critical_person.speed
    
    # Current green time remaining
    time_remaining = get_current_green_remaining()
    
    #