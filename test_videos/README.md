# Test Videoları

Bu klasör MVP demo senaryoları için test videolarını içerir.

## Gerekli Test Senaryoları

### Senaryo 1: Tek Yaşlı Kişi 👴
- **Dosya:** `elderly_slow.mp4`
- **Durum:** Yaşlı kişi yavaşça yaya geçidini geçiyor
- **Beklenen:** +5 saniye ek süre, başarılı geçiş
- **Test:** ✓ Pass / ✗ Fail

### Senaryo 2: Çocuk Koşarak 🧒
- **Dosya:** `child_running.mp4`
- **Durum:** Çocuk hızlı hareket ediyor
- **Beklenen:** +4 saniye ama erken bitiriyor
- **Test:** Sistem erken kesme yapmalı

### Senaryo 3: Tekerlekli Sandalye ♿
- **Dosya:** `wheelchair_crossing.mp4`
- **Durum:** Engelli kişi yavaş ilerliyor
- **Beklenen:** +7 saniye
- **Test:** En uzun süre garantisi

### Senaryo 4: Kalabalık Grup 👥
- **Dosya:** `group_mixed.mp4`
- **Durum:** 5 kişi, içinde 1 yaşlı
- **Beklenen:** En yavaş kişiye göre ayarlama
- **Test:** Grup geçene kadar yeşil

### Senaryo 5: Yanlış Tespit 🌳
- **Dosya:** `false_positive.mp4`
- **Durum:** Ağaç gölgesi, hayvan vb.
- **Beklenen:** Tespit edilmemeli
- **Test:** Model doğruluğu

## Video Kaynaklari

Test videoları şu kaynaklardan bulunabilir:

1. **YouTube** - Public domain pedestrian crossing videos
2. **Pexels/Pixabay** - Royalty-free stock videos
3. **Dataset videoları** - BGVP-main klasöründeki videolar
4. **Kendi çekimleriniz** - Webcam ile kayıt

## Test UI'da Video Kullanımı

```javascript
// Backend'e video path gönder
await fetch('http://localhost:8001/api/start-video?video_path=test_videos/elderly_slow.mp4', 
    { method: 'POST' });
```

## Demo Hazırlık Checklist

- [ ] Her senaryo için video bul/çek
- [ ] Videoları test et
- [ ] Kalibrasyon çizgilerini ayarla
- [ ] Sonuçları dokümante et
- [ ] Jüri sunumu için en iyi örnekleri seç
