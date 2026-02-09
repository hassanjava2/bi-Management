#!/usr/bin/env python
"""
BI Management AI Engine - Run Script
سكربت تشغيل محرك الذكاء الاصطناعي
"""

import uvicorn
import os
import sys

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import get_settings

settings = get_settings()

if __name__ == "__main__":
    print("=" * 50)
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print("=" * 50)
    print(f"Host: {settings.HOST}")
    print(f"Port: {settings.PORT}")
    print(f"Debug: {settings.DEBUG}")
    print(f"Ollama: {settings.OLLAMA_HOST}")
    print(f"Model: {settings.OLLAMA_MODEL}")
    print("=" * 50)
    print("API Docs: http://localhost:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )
