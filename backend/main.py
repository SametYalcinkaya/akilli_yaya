"""
Akıllı Yaya Güvenliği Sistemi - Ana Giriş Noktası
Bu dosya geriye dönük uyumluluk için korunmuştur.
Tüm işlevsellik app.py'de bulunmaktadır.

Kullanım:
    cd backend
    uvicorn app:app --host 0.0.0.0 --port 8001 --reload

veya:
    python main.py
"""
from app import app

if __name__ == "__main__":
    import uvicorn
    print("🚀 Akıllı Yaya Güvenliği Sistemi başlatılıyor...")
    print("📡 Backend: http://localhost:8001")
    print("📚 API Docs: http://localhost:8001/docs")
    uvicorn.run("app:app", host="0.0.0.0", port=8001, reload=True)
