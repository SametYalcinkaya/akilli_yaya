# Model Training Quick Plan (MVP)

## Data Drop Location
- Place raw YOLO-format datasets under `datasets/raw/` (create if missing).
- After merging/cleaning, keep the train/val/test split under `datasets/processed/pedestrians/`.
- Final model checkpoint should live at `backend/models/yolo_pedestrians.pt` (or replace `yolov8n.pt`).

## Classes
```
elderly, child, disabled, adult
```
(Optional later: `pregnant` / `slow` if veri bulursak.)

## Minimal Steps
1) Topla: Her sınıf için ≥500 görüntü (YOLO txt + jpg/png). Roboflow/Kaggle export YOLOv8 formatı tercih.
2) Birleştir: Sınıf isimlerini yukarıdaki listeye normalize et. Yanlış/boş label dosyalarını sil.
3) Böl: 70/20/10 train/val/test. Yolu `datasets/processed/pedestrians/` içinde tut.
4) Augment: Flip, brightness/contrast, hafif rotate. (YOLOv8 varsayılan augment yeterli.)
5) Eğit: `yolov8n.pt` taban model, 50-100 epoch, img 640, batch 16. Örnek komut:
   ```bash
   yolo detect train data=datasets/processed/pedestrians/data.yaml model=yolov8n.pt imgsz=640 epochs=80 batch=16 name=akilli_yaya
   ```
6) Değerlendir: mAP@0.5 ≥ 0.80; inference <50ms/frame hedefi.
7) Dağıt: `best.pt` dosyasını `backend/models/yolov8n.pt` üzerine kopyala veya yeni isimle ekle, `detection_engine.py` sınıf listesini güncelle.

## Notlar
- Eğer hamile/yavaş yürüyen için veri zorsa: ilk aşamada `elderly/child/disabled/adult` ile başlayıp sınıfı sonra ekle.
- Performans yavaşsa: YOLOv8n kal, gerekirse quantization (int8) deneyebilirsin.
- Demo için: küçük bir doğrulama videosunu `datasets/demo/` altında sakla.
