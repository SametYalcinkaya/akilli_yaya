# Akilli Yaya - Model Raporu (2025-12-07)

Bu doküman, yaya güvenliği MVP'si için kullanılan nesne tespit modelini, veriyi, eğitimi, sonuçları ve önerileri teknik ama okunabilir şekilde özetler. Amacımız, projeye sonradan katılan birinin modeli hızla anlayıp yeniden üretebilmesi.

## Model Özeti
- **Algoritma**: YOLOv8n (Ultralytics) - tek aşamalı, anchor-free dedektör; hızlı ve hafif.
- **Amaç**: Dört sınıfta yaya tespiti: `elderly`, `child`, `disabled`, `adult`.
- **Girdi**: RGB görüntü, 640x640 yeniden ölçekleme (letterbox).
- **Çıktı**: Sınıf etiketi + bounding box (xywh), güven skoru.
- **Neden YOLOv8n?** Hafiflik (edge/CPU için uygun), hızlı yakınsama, hazır augmentasyonlar ve kolay CLI/SDK entegrasyonu.

## Mimari (Detaylı)
- **Backbone**: Konvolüsyon + C2f blokları (CSP türevi). Pooling yerine çoğunlukla **stride'lı konvolüsyon** kullanılır; böylece bilgi kaybı azaltılır.
- **Neck**: PAN/FPN benzeri çok-ölçekli birleştirme; yukarı/aşağı örnekleme yine konvolüsyonla yapılır (de facto "feature pyramid").
- **Head** (anchor-free): Her piksel için sınıf ve box dağıtımı çıkar. Bounding box regresyonu için **DFL (Distribution Focal Loss)** ile keskinleşmiş koordinat tahmini.
- **Kayıp fonksiyonları**: Box (CIoU/GIoU), sınıf (BCE/CE), DFL. Tek aşamalı olduğu için end-to-end optimizasyon basit ve hızlıdır.
- **Augment**: YOLOv8 varsayılanları (flip/scale/HSV, mosaic isteğe bağlı). Ek özel augment eklemedik.
- **Parametre boyutu**: ~3M parametre, ~8 GFLOPs (n varyantı).

## İşin Ne Olduğunu Özetle
- Klasik CNN mantığı devam eder: konvolüsyon katmanları ve aktivasyonlar ile özellik çıkarılır.
- Pooling katmanı neredeyse yok; yerine stride'lı konvolüsyon ile boyut küçültme yapılır (daha az bilgi kaybı, daha iyi lokalizasyon).
- Çok ölçekli özellikler neck'te birleştirilir; head her ölçekte kutu ve sınıf üretir.
- Anchor-free olduğu için önceden tanımlı anchor kutular yok; model doğrudan piksel merkezli offset/ölçek tahmin eder. Bu, konfigürasyon yükünü azaltır ve küçük hedeflerde genelde daha kararlı sonuç verir.

## Veri Kümesi
- **Konum**: `datasets/processed/pedestrians/` (YOLOv8 formatı: `images/` ve `labels/`).
- **Split**: train/val/test ≈ 70/20/10.
- **Toplam label dosyası**: 5,154.
- **Sınıf başına instance toplamı**:
  - elderly: 946
  - child: 2,181
  - disabled: 1,740
  - adult: 11,940
- **Dağılım notu**: `adult` sınıfı baskın; `elderly` nispeten az. Sınıf dengesizliği, elderly recall/mAP'i sınırlayabilir.

## Eğitim Kurulumu
- **Komut**:
  ```bash
  yolo detect train \
    data=datasets/processed/pedestrians/data.yaml \
    model=yolov8n.pt imgsz=640 epochs=10 batch=16 \
    name=akilli_yaya_mvp
  ```
- **Donanım**: CPU (AMD Ryzen 7 5800H); ~3 saat.
- **Batch**: 16; **Epoch**: 10 (hızlı ilk tur). Henüz 50 epoch uzatması yapılmadı.
- **Ağırlık çıkışı**: `runs/detect/akilli_yaya_mvp/weights/{best,last}.pt` (optimizer strip). İnferens/deploy için `best.pt` kullanılır.
- **Veri artırma**: YOLOv8 varsayılan augment (flip, scale, hsv). Ek özel augment uygulanmadı.

## Sonuçlar (best.pt)
- **Genel**: Precision 0.909, Recall 0.840, mAP@0.5 0.905, mAP@0.5:0.95 0.628.
- **Sınıf bazlı mAP@0.5**:
  - elderly: 0.770
  - child: 0.948
  - disabled: 0.967
  - adult: 0.936
- **Yorum**: Kısa eğitim ve CPU ortamına rağmen genel doğruluk yüksek; düşük recall riskine rağmen yanlış alarm oranı düşük. Elderly performansı, veri dengesizliği ve örnek çeşitliliği nedeniyle görece zayıf.

## Eğitimden Çıkan Dersler
- CPU'da 10 epoch kısa sürede temel doğruluk sağladı; yakınsama tamamlanmadı, 50-100 epoch ile recall ve mAP50-95 yükselir.
- Elderly örnekleri az ve çeşitlilik kısıtlı; hem veri artırımı hem sınıf dengesi önemli.
- Anchor-free head ve DFL, küçük/ince kutularda lokalizasyonu iyileştiriyor; ancak veri dengesizliği yine belirleyici.

## Yeniden Üretim Adımları
1) Ortam: `python -m venv .venv && pip install -r requirements.txt` (ultralytics içerir).
2) Veriyi konumlandır: `datasets/processed/pedestrians/` (train/val/test altı hazır, `data.yaml` bu yolu işaret ediyor).
3) Eğitimi çalıştır: Yukarıdaki `yolo detect train ...` komutu.
4) Çıktıları kopyala: `runs/detect/akilli_yaya_mvp/weights/best.pt` dosyasını deploy hedefi `backend/models/yolov8n.pt` üzerine alın (veya referansı güncelleyin).
5) Doğrula: `yolo detect val model=runs/detect/akilli_yaya_mvp/weights/best.pt data=datasets/processed/pedestrians/data.yaml`.

## Entegrasyon Durumu
- Backend `DetectionEngine` YOLOv8 ağırlıklarını `backend/models/yolov8n.pt` altında bekliyor; yoksa stub’a düşüyor.
- WebSocket akışında bbox ve base64 frame gönderimi hazır; gerçek modelle değişim için yalnızca ağırlık dosyasını yerleştirmek yeterli.

## Riskler ve Açıklar
- **Sınıf dengesizliği**: Elderly az; bu sınıfta recall/mAP daha düşük.
- **Kısa eğitim**: 10 epoch; tam yakınsama yok. 50-100 epoch ile iyileşme beklenir.
- **CPU eğitimi**: Daha uzun sürede yakınsama; GPU ile daha iyi sonuç alınabilir.
- **Gerçek dünya varyasyonu**: Farklı açı, ışık, kalabalık ortam için augmentasyon/ek veri gerekli olabilir.

## Önerilen İyileştirmeler
- 50 epoch fine-tune (aynı run, `best.pt`ten devam).  
  Örnek: `yolo detect train data=... model=runs/detect/akilli_yaya_mvp/weights/best.pt epochs=50 batch=16 name=akilli_yaya_mvp_resume`.
- Sınıf balansı: Elderly ve disabled için ek görüntü topla; gerekirse class-balanced sampling veya loss weight.
- Augment: Daha güçlü ama kontrollü augment (mosaic on/off denemesi, mixup kapalı, hafif rotation/blur) ile çeşitlilik.
- Model boyutu: Eğer gecikme kritik ve doğruluk yeterli ise `yolov8n` kal; doğruluk gerekirse `yolov8s` denenebilir (daha ağır).
- Dağıtım: `best.pt`yi `backend/models/yolov8n.pt` olarak koy, `DetectionEngine` sınıf listesini `['elderly','child','disabled','adult']` ile uyumlu tut.

## Kısa SSS
- **Model ne yapar?** Dört yaya kategorisini tespit eder, bbox ve sınıf döner.
- **Şu anki başarı seviyesi?** mAP50 ~0.90; elderly sınıfı göreceli zayıf, diğerleri güçlü.
- **Daha iyi sonuç için ilk adım?** Daha fazla elderly/disabled veri + 50 epoch eğitim.
- **Nereden başlarım?** `runs/detect/akilli_yaya_mvp/weights/best.pt` dosyasını backend’e koy, gerekirse CLI ile val/test yap.
