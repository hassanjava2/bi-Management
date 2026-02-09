"""
BI Camera AI - Run Script
سكربت تشغيل نظام تحليل الكاميرات
"""

import uvicorn
from app.config import settings

if __name__ == "__main__":
    print("=" * 50)
    print("[*] BI Camera AI System")
    print("[*] Starting server...")
    print(f"[*] URL: http://{settings.HOST}:{settings.PORT}")
    print(f"[*] Docs: http://localhost:{settings.PORT}/docs")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
