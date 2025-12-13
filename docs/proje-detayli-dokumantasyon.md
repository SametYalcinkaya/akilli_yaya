# Akıllı Yaya Güvenliği Projesi - Kapsamlı Dokümantasyon

**Hazırlanma Tarihi**: 7 Aralık 2025  
**Hedef Kitle**: Projeyi ilk kez gören, makine öğrenmesi ve bilgisayarlı görü konularında temel bilgisi olan veya olmayan okuyucular.

---

## İçindekiler
1. [Proje Nedir? (Kim, Ne, Neden, Nerede, Ne Zaman, Nasıl)](#proje-nedir)
2. [Kullanılan Teknolojiler ve Kavramlar](#kullanılan-teknolojiler)
3. [Veri Kümesi Hazırlığı](#veri-kümesi)
4. [Yapay Zeka Modeli ve Mimari](#yapay-zeka-modeli)
5. [Eğitim Süreci](#eğitim-süreci)
6. [Sonuçlar ve Başarı Metrikleri](#sonuçlar)
7. [Sistem Entegrasyonu](#sistem-entegrasyonu)
8. [Karşılaşılan Sorunlar ve Çözümler](#sorunlar-ve-çözümler)
9. [Gelecek Adımlar](#gelecek-adımlar)

---

## 1. Proje Nedir? {#proje-nedir}

### Kim?
Bu proje, yaya geçitlerinde akıllı trafik ışığı kontrolü sağlamak amacıyla geliştirilmiştir. Hedef kullanıcılar: belediyeler, akıllı şehir projeleri, trafik güvenliği otoriteleri.

### Ne?
Kamera görüntülerinden yayaları gerçek zamanlı olarak tespit eden, onları **dört kategoriye** ayıran (yaşlı, çocuk, engelli, yetişkin) ve bu bilgiye göre trafik ışıklarını dinamik olarak yöneten bir akıllı sistem.

### Neden?
- **Güvenlik**: Yavaş hareket eden yayalar (yaşlı, engelli, çocuk) için yeşil ışık süresini otomatik uzatarak kazaları önlemek.
- **Verimlilik**: Yaya yoksa boş yere yeşil yakmamak; trafik akışını optimize etmek.
- **Erişilebilirlik**: Engelli bireylerin karşıya geçişini kolaylaştırmak.

### Nerede?
- **Fiziksel**: Yaya geçitlerinde, kavşaklarda kamera ve sensör altyapısı ile.
- **Yazılım**: Backend (Python/FastAPI), Frontend (React), Model (YOLOv8).

### Ne Zaman?
Proje MVP (Minimum Viable Product) aşamasında. İlk model eğitimi 7 Aralık 2025'te tamamlandı. Tam deployment henüz yapılmadı; prototip aşamasında.

### Nasıl?
1. Kamera görüntülerini al.
2. Yapay zeka modeliyle (YOLOv8) yayaları tespit et ve sınıflandır.
3. Tespit edilen yayaların konumunu, hızını ve kategorisini takip et.
4. Trafik ışığı algoritmasına bu verileri aktar.
5. Gerektiğinde yeşil ışık süresini uzat veya değiştir.

---

## 2. Kullanılan Teknolojiler ve Kavramlar {#kullanılan-teknolojiler}

### 2.1 Yapay Zeka ve Bilgisayarlı Görü Temelleri

#### **Bilgisayarlı Görü (Computer Vision)**
Bilgisayarların görsel dünyayı anlamasını sağlayan alan. Görüntülerden nesne tespit etme, tanıma, sınıflandırma gibi görevleri kapsar.

#### **Nesne Tespiti (Object Detection)**
Bir görüntüdeki nesnelerin **nerede** olduğunu (bounding box) ve **ne** olduğunu (sınıf) tespit etme. Örnek: "Bu görüntüde 3 yaşlı yaya var, koordinatları şu şu."

#### **Derin Öğrenme (Deep Learning)**
Çok katmanlı yapay sinir ağları kullanarak veriyi öğrenen makine öğrenmesi yöntemi. Görüntü işlemede çok başarılı.

#### **Konvolüsyon Sinir Ağı (CNN - Convolutional Neural Network)**
Görüntüleri işlemek için tasarlanmış özel sinir ağı tipi. Görüntünün farklı özelliklerini (kenar, doku, şekil) katman katman öğrenir.

- **Konvolüsyon Katmanı**: Görüntü üzerinde filtre gezdirerek özellik haritası çıkarır.
- **Aktivasyon Fonksiyonu**: ReLU gibi doğrusal olmayan işlemler; modelin karmaşık kalıplar öğrenmesini sağlar.
- **Pooling (Havuzlama)**: Özellik haritasını küçültür (örn. max pooling); eski mimarilerde yaygın.
- **Stride (Adım)**: Filtrenin kaç piksel atladığı. Modern mimarilerde pooling yerine stride'lı konvolüsyon kullanılır (bilgi kaybı daha az).

### 2.2 YOLO (You Only Look Once)

#### **YOLO Nedir?**
Tek seferde (tek bir ileri geçişte) nesne tespiti yapan hızlı algoritmalar ailesi. Görüntüyü ızgaraya böler, her hücre için kutu ve sınıf tahmin eder.

#### **YOLOv8 Özellikleri**
- **Tek Aşamalı**: Bölge önerisi + sınıflandırma gibi iki aşamalı değil; hızlı ve verimli.
- **Anchor-Free**: Önceden tanımlı kutu boyutları (anchor) yok; doğrudan offset/boyut tahmin eder.
- **Ultralytics**: Kolay CLI ve Python API sunan popüler YOLOv8 implementasyonu.

#### **YOLOv8n**
YOLOv8 ailesinin en küçük (nano) modeli. ~3 milyon parametre, CPU/edge cihazlarda çalışabilecek kadar hafif.

### 2.3 Kullandığımız Teknik Terimler

- **Bounding Box (Sınırlayıcı Kutu)**: Nesnenin etrafını çevreleyen dikdörtgen. Genelde (x, y, w, h) formatında.
- **Sınıf (Class)**: Nesnenin türü. Bizde: elderly, child, disabled, adult.
- **Güven Skoru (Confidence Score)**: Modelin tahmin için ne kadar emin olduğu (0-1 arası).
- **Epoch**: Eğitim verisi üzerinde tam bir geçiş. 10 epoch = veri 10 kez işlendi.
- **Batch**: Tek seferde işlenen görüntü sayısı. Batch 16 = her adımda 16 görüntü.
- **mAP (mean Average Precision)**: Nesne tespitinde başarı ölçüsü. 0-1 arası; yüksek iyi.
- **Precision (Kesinlik)**: Tespit edilenlerin ne kadarı gerçekten doğru.
- **Recall (Duyarlılık)**: Gerçekte var olanların ne kadarını tespit edebildik.

---

## 3. Veri Kümesi Hazırlığı {#veri-kümesi}

### 3.1 Veri Kaynağı
İki açık kaynak veri kümesi kullandık:
1. **PedestriansDetection.v1** (Roboflow): Genel yaya görüntüleri.
2. **Wheelchair Detection.v1i** (Roboflow): Tekerlekli sandalye kullanan engelli bireyler.

### 3.2 Veri Formatı
**YOLOv8 Format**: Her görüntü için bir `.txt` etiket dosyası. İçeriği:
```
<class_id> <x_center> <y_center> <width> <height>
```
- Tüm değerler normalize (0-1 arası).
- Örnek: `0 0.5 0.5 0.2 0.3` → Sınıf 0, görüntü ortasında, genişlik %20, yükseklik %30.

### 3.3 Sınıflar
Orijinal veri setlerinde farklı isimler vardı. Bunları dört sınıfa birleştirdik:
- **0: elderly** (yaşlı)
- **1: child** (çocuk)
- **2: disabled** (engelli)
- **3: adult** (yetişkin)

### 3.4 Veri Remap (Yeniden Eşleme)
Python script (`scripts/remap_datasets.py`) ile:
- Orijinal sınıf isimlerini yeni 4 sınıfa eşledik.
- Belirsiz/kullanılmayan sınıfları atladık.
- Boş/hatalı etiket dosyalarını temizledik.

### 3.5 Veri Sayıları
**Toplam**: 5,154 etiketli görüntü  
**Split (Bölünme)**:
- Train (eğitim): 4,521 görüntü (~70%)
- Validation (doğrulama): 397 görüntü (~20%)
- Test (test): 236 görüntü (~10%)

**Sınıf Başına Instance (Nesne) Sayısı** (tüm split toplamı):
- elderly: 946
- child: 2,181
- disabled: 1,740
- adult: 11,940

**Gözlem**: `adult` sınıfı baskın (11.9k örnek), `elderly` en az (946 örnek). Bu **sınıf dengesizliği** modelin yaşlı tespitinde daha zayıf olmasına neden olabilir.

### 3.6 Veri Konumu
```
datasets/processed/pedestrians/
├── data.yaml          # Veri yapılandırması (sınıf isimleri, yollar)
├── train/
│   ├── images/
│   └── labels/
├── valid/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

---

## 4. Yapay Zeka Modeli ve Mimari {#yapay-zeka-modeli}

### 4.1 Model Seçimi: YOLOv8n

#### Neden YOLOv8?
1. **Hız**: Tek geçişte tespit; gerçek zamanlı uygulamalar için ideal.
2. **Doğruluk**: Modern mimariler; anchor-free head ile daha iyi lokalizasyon.
3. **Kullanım Kolaylığı**: Ultralytics CLI ve Python API.
4. **Topluluk Desteği**: Geniş dokümantasyon, örnekler, pretrained ağırlıklar.

#### Neden YOLOv8n (nano)?
- **Hafif**: ~3M parametre, ~8 GFLOPs.
- **CPU Uyumlu**: Edge cihazlarda çalışabilir.
- **MVP için yeterli**: İlk prototip için hız/doğruluk dengesi iyi.

### 4.2 Mimari Detayları

YOLOv8n üç ana bölümden oluşur:

#### **A. Backbone (Omurga)**
Görüntüden özellik haritaları çıkarır.

- **Konvolüsyon Katmanları**: Filtreler uygular, kenar/doku/şekil öğrenir.
- **C2f Blokları**: CSP (Cross Stage Partial) türevi; özellik yeniden kullanımı ve gradient akışını iyileştirir.
- **Stride'lı Konvolüsyon**: Pooling yerine kullanılır. Örnek: 640x640 → 320x320 → 160x160 ... şeklinde boyut azaltır.
  - **Pooling vs Stride**: Pooling (eski) bilgi kaybeder (max pooling en büyük pikseli alır), stride'lı konvolüsyon öğrenerek küçültür (daha az kayıp).

#### **B. Neck (Boyun)**
Farklı ölçeklerdeki özellikleri birleştirir.

- **PAN/FPN Benzeri Yapı**: Büyük nesneler için derin katmanlar, küçük nesneler için sığ katmanlar kullanır.
- **Yukarı Örnekleme (Upsampling)**: Düşük çözünürlük özellik haritalarını büyütür.
- **Aşağı Örnekleme (Downsampling)**: Konvolüsyonla yüksek çözünürlüğü küçültür.
- **Feature Pyramid**: Çok ölçekli tespit için gerekli; örnek: 20x20, 40x40, 80x80 grid'lerde farklı boyutlardaki nesneler tespit edilir.

#### **C. Head (Baş) - Anchor-Free**
Her grid hücresinde kutu ve sınıf tahmin eder.

- **Anchor-Free**: Eski YOLO'larda önceden tanımlı kutu boyutları (anchor) vardı. YOLOv8'de her piksel doğrudan offset ve boyut tahmin eder.
- **DFL (Distribution Focal Loss)**: Kutu koordinatlarını daha keskin tahmin etmek için dağıtım öğrenir (klasik regresyon yerine).
- **Çıktılar**:
  - Sınıf skorları (4 sınıf için)
  - Bounding box koordinatları (x, y, w, h)
  - Güven skoru (objectness)

### 4.3 Eğitim Süreci Nasıl İşler?

1. **Veriyi Hazırla**: Görüntü + etiket.
2. **Augmentation (Veri Artırma)**: YOLOv8 otomatik uygular:
   - **Flip (Yansıtma)**: Yatay çevir.
   - **Scale (Ölçeklendirme)**: Zoom in/out.
   - **HSV Jittering**: Renk/parlaklık değişimi.
   - **Mosaic (isteğe bağlı)**: 4 görüntüyü birleştir (çeşitlilik artırır).
3. **İleri Geçiş (Forward Pass)**: Model tahmin yapar.
4. **Kayıp Hesaplama (Loss Calculation)**:
   - **Box Loss (CIoU/GIoU)**: Tahmin kutu ile gerçek kutu arasındaki fark. IoU (Intersection over Union) tabanlı; tam örtüşmede 1, hiç örtüşmezse 0.
   - **Sınıf Loss (BCE/CE)**: Sınıf tahmini için binary cross-entropy veya categorical cross-entropy.
   - **DFL Loss**: Koordinat dağıtımı için özel kayıp.
5. **Geri Yayılım (Backpropagation)**: Kayıp gradyanlarını hesapla.
6. **Ağırlık Güncelleme (Optimization)**: SGD/Adam ile parametreleri iyileştir.
7. **Epoch Tekrar**: Veri seti bitene kadar devam, sonra yeni epoch.

### 4.4 Pretrained Model
YOLOv8n.pt, COCO veri setinde (80 sınıf, milyonlarca görüntü) eğitilmiş. Biz bunu **transfer learning** ile kullandık:
- COCO'dan öğrendiği genel özellikler (kenar, şekil, insan vücudu) korunur.
- Son katmanlar 4 sınıfa (elderly/child/disabled/adult) göre yeniden eğitilir.
- Bu sayede az veriyle bile makul sonuç alırız.

---

## 5. Eğitim Süreci {#eğitim-süreci}

### 5.1 Eğitim Komutu
```bash
yolo detect train \
  data=datasets/processed/pedestrians/data.yaml \
  model=yolov8n.pt \
  imgsz=640 \
  epochs=10 \
  batch=16 \
  name=akilli_yaya_mvp
```

**Parametre Açıklamaları**:
- `data`: Veri yapılandırma dosyası (sınıflar, train/val/test yolları).
- `model`: Başlangıç ağırlığı (pretrained YOLOv8n).
- `imgsz=640`: Görüntü boyutu 640x640'a resize edilir.
- `epochs=10`: 10 epoch (hızlı ilk tur; tam eğitim için 50-100 önerilir).
- `batch=16`: Her adımda 16 görüntü işlenir.
- `name`: Çıktı klasörü ismi.

### 5.2 Donanım ve Süre
- **Donanım**: AMD Ryzen 7 5800H (CPU).
- **GPU Yok**: CPU eğitimi daha yavaş ama maliyet/erişim açısından pratik.
- **Süre**: ~3 saat (10 epoch).

### 5.3 Çıktılar
Eğitim bittiğinde:
```
runs/detect/akilli_yaya_mvp/
├── weights/
│   ├── best.pt       # En iyi doğrulama performansı
│   ├── last.pt       # Son epoch ağırlıkları
├── results.csv       # Epoch bazında metrikler
├── confusion_matrix.png
├── results.png       # Loss/mAP grafikleri
└── ...
```

**Önemli**: `best.pt` dosyası deployment için kullanılır.

### 5.4 Validation (Doğrulama)
Her epoch sonunda validation seti üzerinde model test edilir:
- Train set overfitting kontrolü için.
- En iyi performansı gösteren ağırlık (best.pt) saklanır.

---

## 6. Sonuçlar ve Başarı Metrikleri {#sonuçlar}

### 6.1 Metrik Açıklamaları

#### **Precision (Kesinlik)**
Modelin tespit ettiği nesnelerden kaçı gerçekten doğru?  
Formula: `TP / (TP + FP)`  
- TP (True Positive): Doğru tespit.
- FP (False Positive): Yanlış alarm (olmayan nesneyi tespit etme).

**Örnek**: Model 100 yaya tespit etti, 90'ı gerçekten yaya → Precision = 0.90.

#### **Recall (Duyarlılık)**
Gerçekte var olan nesnelerin kaçını bulduk?  
Formula: `TP / (TP + FN)`  
- FN (False Negative): Kaçırılan nesne (var ama tespit edemedik).

**Örnek**: Görüntüde 100 yaya var, model 80'ini buldu → Recall = 0.80.

#### **mAP@0.5 (mean Average Precision at IoU 0.5)**
- **IoU (Intersection over Union)**: Tahmin kutu ile gerçek kutunun örtüşme oranı.
- **IoU ≥ 0.5**: Kutular %50+ örtüşüyorsa doğru sayılır.
- **AP (Average Precision)**: Her sınıf için precision-recall eğrisinin altındaki alan.
- **mAP@0.5**: Tüm sınıfların AP ortalaması.

**Yüksek mAP@0.5**: Model hem kesin (az yanlış alarm) hem duyarlı (az kaçırma).

#### **mAP@0.5:0.95**
IoU eşiğini 0.5'ten 0.95'e kadar (0.05 adımlarla) değiştirip ortalama alır. Daha sıkı metrik; kutunun çok daha kesin olmasını ister.

### 6.2 Bizim Sonuçlar (best.pt)

| Metrik | Değer |
|--------|-------|
| Precision | 0.909 |
| Recall | 0.840 |
| mAP@0.5 | 0.905 |
| mAP@0.5:0.95 | 0.628 |

**Sınıf Bazlı mAP@0.5**:

| Sınıf | mAP@0.5 | Örnek Sayısı |
|-------|---------|--------------|
| elderly | 0.770 | 946 |
| child | 0.948 | 2,181 |
| disabled | 0.967 | 1,740 |
| adult | 0.936 | 11,940 |

### 6.3 Sonuç Yorumu

#### **Genel Başarı**: ⭐⭐⭐⭐☆ (4/5)
- **mAP@0.5 0.905**: Çok iyi. Modelin tespit doğruluğu yüksek.
- **Precision 0.909**: Tespit edilenlerin %91'i gerçekten doğru. Az yanlış alarm.
- **Recall 0.840**: Gerçek yayaların %84'ünü tespit ediyor. %16 kaçırma var (iyileştirilebilir).
- **mAP@0.5:0.95 0.628**: Orta seviye. Kutu lokalizasyonu iyi ama mükemmel değil.

#### **Sınıf Bazlı Analiz**:

**🟢 Disabled (0.967) ve Child (0.948)**: Mükemmel.  
- Veri sayısı orta/iyi (1.7k, 2.1k).
- Görsel özellikleri belirgin (tekerlekli sandalye, boy farkı).

**🟢 Adult (0.936)**: Çok iyi.  
- En çok veri (11.9k); model çok öğrenmiş.

**🟡 Elderly (0.770)**: İyileştirilebilir.  
- Neden düşük?
  1. **Az veri**: 946 örnek, diğerlerine göre 2-10x daha az.
  2. **Belirsiz özellikler**: Yaşlı ile yetişkin ayrımı zor; duruş, yürüyüş tarzı gibi ince ipuçları gerekir.
  3. **Sınıf dengesizliği**: Model adult'a daha çok maruz kaldığı için yaşlıları adult diye sınıflandırma eğiliminde olabilir.

### 6.4 Gerçek Hayat Performansı (Tahmin)
- **Az yanlış alarm**: Precision yüksek, trafik ışığı gereksiz uzamaz.
- **Bazı yayaları kaçırabilir**: Recall 0.84; kalabalıkta veya zor açılarda bazı yayalar tespit edilmeyebilir.
- **Elderly tespiti zayıf**: Özellikle yaşlı yayaları yetişkin olarak algılayabilir (güvenlik riski!).

**Öneri**: Elderly verisi artırılmalı, 50-100 epoch eğitim yapılmalı.

---

## 7. Sistem Entegrasyonu {#sistem-entegrasyonu}

### 7.1 Mimari Genel Bakış

```
[Kamera] → [Backend (Python/FastAPI)] → [Frontend (React)]
              ↓
         [YOLOv8 Model]
              ↓
         [Tracking Sistemi]
              ↓
         [Karar Algoritması]
              ↓
         [Trafik Kontrolcüsü]
```

### 7.2 Backend Modülleri

#### **camera_handler.py**
- OpenCV ile kamera/video beslemesi okur.
- Yoksa stub (sahte) kare üretir.
- Frame'i base64 encode ederek WebSocket'e gönderir.

#### **detection_engine.py**
- YOLOv8 modelini yükler (`backend/models/yolov8n.pt`).
- Her frame'de yaya tespiti yapar.
- Bounding box, sınıf, güven skoru döner.
- Model yoksa demo amaçlı stub nesne üretir.

#### **tracking_system.py**
- Tespit edilen yayaları frame'ler arası takip eder.
- Her yayaya ID atar (örn. `ped_001`).
- Hız ve konum tahmini yapar (basit heuristik).
- Zaman damgası ile geçiş süresini hesaplar.

#### **decision_algorithm.py**
- Yaya kategorisine göre karar verir:
  - Elderly/Disabled/Child → "Yeşil ışığı uzat"
  - Adult → Normal süre
- Yaya sayısı, konum (yolun hangi tarafı) gibi faktörleri de dikkate alabilir.

#### **traffic_controller.py**
- Sanal trafik ışığı simülasyonu.
- Aktif yön (kuzey/güney/doğu/batı), renk (kırmızı/yeşil), geri sayım.
- Karar algoritmasından gelen komutları uygular (uzatma, rotasyon).

#### **main.py**
- FastAPI ile REST endpoint'ler (`/start`, `/stop`, `/reset`, `/status`).
- WebSocket endpoint (`/ws`): Frontend'e canlı veri akışı (frame, bbox, metrikler, ışık durumu).

### 7.3 Frontend (React + Tailwind)

#### **Sol Panel**:
- **VideoDisplay**: Base64 frame render, bbox overlay çizer.
- **MetricsCards**: Aktif yaya sayısı, ortalama hız, uzatma sayısı.
- **ControlPanel**: Başlat/Durdur/Reset butonları.

#### **Sağ Panel**:
- **IntersectionMap**: Kavşak şeması, kalibrasyon çizgileri.
- **TrafficLight**: Aktif yön, renk, geri sayım gösterir.

#### **WebSocket Hook** (`useWebSocket.js`):
- Backend'den gelen JSON mesajları parse eder.
- State'i günceller (frame, detections, metrics, lights).

### 7.4 Veri Akışı (Örnek Senaryo)

1. Kamera frame yakalar → `camera_handler` okur.
2. `detection_engine` YOLOv8 ile yayaları tespit eder → `[{class: 'elderly', bbox: [x,y,w,h], conf: 0.92}, ...]`
3. `tracking_system` her yayaya ID atar, hızını hesaplar → `{ped_001: {category: 'elderly', speed: 1.2 m/s, ...}}`
4. `decision_algorithm` yaşlı tespit eder → `{action: 'extend', direction: 'north', duration: 5}`
5. `traffic_controller` yeşil ışığı 5 saniye uzatır.
6. `main.py` WebSocket üzerinden frontend'e gönderir → `{frame: 'base64...', detections: [...], lights: {...}}`
7. Frontend görüntüyü ve ışık durumunu günceller.

### 7.5 Model Deployment

Şu an `best.pt` dosyası `runs/detect/akilli_yaya_mvp/weights/` altında. Onu `backend/models/yolov8n.pt` olarak kopyalamalıyız:

```bash
cp runs/detect/akilli_yaya_mvp/weights/best.pt backend/models/yolov8n.pt
```

Backend başladığında bu dosyayı yükler ve gerçek tespit yapar (stub yerine).

---

## 8. Karşılaşılan Sorunlar ve Çözümler {#sorunlar-ve-çözümler}

### 8.1 Problem: Sınıf Dengesizliği
**Durum**: Adult 11.9k örnek, elderly 946 örnek.  
**Etki**: Model elderly'yi az öğreniyor, yetişkinle karıştırabiliyor.  
**Çözüm**:
- Daha fazla elderly/disabled görüntü toplamak.
- Augmentation'ı elderly'ye daha yoğun uygulamak.
- Class-balanced loss veya weighted sampling.

### 8.2 Problem: Kısa Eğitim (10 Epoch)
**Durum**: CPU'da zaman kısıtı nedeniyle 10 epoch ile durduruldu.  
**Etki**: Model tam yakınsamadı, recall ve mAP50-95 iyileştirilebilir.  
**Çözüm**:
- 50-100 epoch eğitim (best.pt'den devam).
- GPU kullanımı (daha hızlı).

### 8.3 Problem: CPU Eğitimi Yavaşlığı
**Durum**: 10 epoch ~3 saat.  
**Etki**: Uzun iterasyonlar için pratik değil.  
**Çözüm**:
- Google Colab / Kaggle (ücretsiz GPU).
- Bulut GPU kiralama (AWS, Azure).
- Yerel GPU kartı (NVIDIA).

### 8.4 Problem: Pooling vs Stride Karmaşası
**Durum**: Klasik CNN'lerde pooling vardı, YOLOv8'de yok mu?  
**Açıklama**: YOLOv8 modern bir mimari; pooling yerine **stride'lı konvolüsyon** kullanır. Bilgi kaybı daha az, lokalizasyon daha iyi.  
**Sonuç**: Model daha kesin bounding box'lar üretir.

### 8.5 Problem: Anchor-Free Ne Demek?
**Durum**: Eski YOLO'larda anchor box konfigürasyonu gerekliydi.  
**Açıklama**: YOLOv8 anchor-free; her piksel doğrudan kutu offset/boyutu tahmin eder. Daha basit, küçük nesnelerde daha stabil.  
**Sonuç**: Yapılandırma kolaylığı, daha genel tespit yeteneği.

---

## 9. Gelecek Adımlar {#gelecek-adımlar}

### 9.1 Kısa Vadeli (1-2 Hafta)
1. **50 Epoch Eğitim**: `best.pt`'den devam et, recall ve mAP50-95'i iyileştir.
2. **Elderly Veri Artırma**: Roboflow/Kaggle'dan daha fazla yaşlı yaya görüntüsü bul, ekle.
3. **Gerçek Kamera Testi**: Webcam ile canlı tespit, latency ölçümü.
4. **Frontend İyileştirmeleri**: Canlı grafik (hız/zaman), geçmiş olaylar logu.

### 9.2 Orta Vadeli (1 Ay)
1. **Model İyileştirme**:
   - Class-balanced loss veya focal loss.
   - Augmentation stratejisi: daha fazla yaşlı için flip/rotate/blur.
   - YOLOv8s dene (daha büyük model, daha yüksek doğruluk).
2. **Tracking İyileştirme**:
   - DeepSORT/ByteTrack gibi gelişmiş tracker.
   - ID switch azaltma.
3. **Karar Algoritması**:
   - Yaya hızı, kalibrasyon verileri (gerçek mesafe).
   - Çoklu yön desteği (4 yön trafik ışığı).
4. **Demo Video**: Gerçek/simüle videoda çalışan sistem kaydı.

### 9.3 Uzun Vadeli (3-6 Ay)
1. **Edge Deployment**: Raspberry Pi, NVIDIA Jetson gibi cihazlarda çalıştırma.
2. **Quantization**: INT8 quantization ile model boyutunu küçült, hızı artır.
3. **Pregnant/Slow Sınıfı Ekleme**: Yeni veri topla, 6 sınıfa genişlet.
4. **Gerçek Trafik Sistemi Entegrasyonu**: Belediye/kent otomasyon sistemleri ile haberleşme.
5. **A/B Testi**: Gerçek kavşakta test, kaza/verimlilik verisi toplama.

---

## Özet Tablo

| Konu | Detay |
|------|-------|
| **Proje Adı** | Akıllı Yaya Güvenliği |
| **Amaç** | Yaya geçitlerinde kategoriye göre dinamik trafik kontrolü |
| **Model** | YOLOv8n (Ultralytics) |
| **Sınıflar** | elderly, child, disabled, adult |
| **Veri** | 5,154 etiketli görüntü (train/val/test 70/20/10) |
| **Eğitim** | 10 epoch, CPU, batch 16, imgsz 640 |
| **Sonuçlar** | Precision 0.909, Recall 0.840, mAP@0.5 0.905 |
| **En İyi Sınıf** | disabled (0.967), child (0.948) |
| **İyileştirilecek** | elderly (0.770) - az veri, dengesizlik |
| **Teknoloji** | Backend: FastAPI, Frontend: React, WS: Real-time |
| **Deployment** | MVP aşaması, best.pt → backend/models/yolov8n.pt |
| **Gelecek** | 50 epoch, daha fazla veri, gerçek kamera testi |

---

## Sonuç

Bu dokümantasyon, "Akıllı Yaya Güvenliği" projesinin **ne olduğunu, neden yapıldığını, nasıl geliştirildiğini, hangi teknolojilerin kullanıldığını, veriyi nasıl hazırladığımızı, modeli nasıl eğittiğimizi, sonuçların ne anlama geldiğini** ve **ileride ne yapacağımızı** detaylıca açıklamaktadır.

Projeye yeni katılan biri bu dokümanı okuyarak:
1. Projenin amacını ve kapsamını anlar.
2. Kullanılan terimleri (CNN, YOLO, mAP, precision, recall, anchor-free, stride, DFL, vb.) kavrar.
3. Veri kümesini nasıl hazırladığımızı öğrenir.
4. Modeli nasıl eğittiğimizi ve sonuçları nasıl yorumladığımızı görür.
5. Sistemi nasıl entegre edeceğimizi bilir.
6. Karşılaştığımız sorunları ve çözümlerimizi inceler.
7. Gelecek adımları planlayabilir.

**Not**: Bu dokümantasyon canlı bir belge olarak güncel tutulmalıdır. Her büyük değişiklikte (yeni veri, model update, mimari değişiklik) güncellenmelidir.

---

**Son Güncelleme**: 7 Aralık 2025  
**Hazırlayan**: Akıllı Yaya Ekibi  
**Versiyon**: 1.0
