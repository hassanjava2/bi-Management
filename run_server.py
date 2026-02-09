# -*- coding: utf-8 -*-
"""
تشغيل خادم الذكاء الاصطناعي
Run AI Server
"""

import os
import sys
import webbrowser
from threading import Timer

# إضافة المسار
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def open_browser():
    """فتح المتصفح"""
    webbrowser.open("http://localhost:8000")


def main():
    print("\n" + "="*60)
    print("🤖 نظام الذكاء الاصطناعي المحلي - BI Distor")
    print("="*60)
    
    # التحقق من المتطلبات
    try:
        import torch
        import fastapi
        import uvicorn
        print("✅ جميع المتطلبات متوفرة")
    except ImportError as e:
        print(f"❌ متطلبات ناقصة: {e}")
        print("\nقم بتثبيت المتطلبات:")
        print("pip install -r requirements.txt")
        return
    
    # التحقق من وجود النموذج
    model_path = "ai_data/models/best_model.pt"
    if not os.path.exists(model_path):
        model_path = "ai_data/models/final_model.pt"
    
    if not os.path.exists(model_path):
        print("\n⚠️ النموذج غير موجود!")
        print("قم بتدريب النموذج أولاً:")
        print("python train.py --mode train")
        print("\nأو للتدريب السريع:")
        print("python train.py --mode train --model-size small --epochs 5")
        print("\n" + "="*60)
    
    # تشغيل الخادم
    print("\n🚀 جاري تشغيل الخادم...")
    print("📡 API: http://localhost:8000")
    print("📄 Docs: http://localhost:8000/docs")
    print("🌐 Web: افتح ai_web/index.html في المتصفح")
    print("\n⌨️ اضغط Ctrl+C للإيقاف")
    print("="*60 + "\n")
    
    # فتح المتصفح بعد ثانيتين
    # Timer(2.0, open_browser).start()
    
    # تشغيل uvicorn
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    main()
