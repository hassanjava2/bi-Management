"""
BI Management AI Engine - Main Application
التطبيق الرئيسي لمحرك الذكاء الاصطناعي
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import time
from loguru import logger
import sys
import os

# إعداد مسار العمل
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings
from app.routes import chat, tasks, analysis
from app.models.llm import get_llm

settings = get_settings()


# إعداد الـ Logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    level=settings.LOG_LEVEL
)

# إضافة ملف log
os.makedirs("logs", exist_ok=True)
logger.add(
    settings.LOG_FILE,
    rotation="10 MB",
    retention="7 days",
    level="DEBUG"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("=" * 50)
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info("=" * 50)
    
    # التحقق من Ollama
    llm = await get_llm()
    if hasattr(llm, 'check_connection'):
        connected = await llm.check_connection()
        if connected:
            logger.info("Ollama connected successfully")
            models = await llm.list_models()
            logger.info(f"Available models: {models}")
        else:
            logger.warning("Ollama not available - using fallback")
    else:
        logger.info("Using fallback LLM")
    
    yield
    
    # Shutdown
    logger.info("Shutting down AI Engine...")
    if hasattr(llm, 'close'):
        await llm.close()


# إنشاء التطبيق
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="محرك الذكاء الاصطناعي لنظام BI Management",
    lifespan=lifespan
)


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.info(
        f"{request.method} {request.url.path} "
        f"- {response.status_code} - {process_time:.3f}s"
    )
    
    return response


# Error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_ERROR",
            "message": str(exc) if settings.DEBUG else "حدث خطأ داخلي"
        }
    )


# تسجيل المسارات
app.include_router(chat.router, prefix="/api/ai")
app.include_router(tasks.router, prefix="/api/ai")
app.include_router(analysis.router, prefix="/api/ai")


# مسارات أساسية
@app.get("/")
async def root():
    """الصفحة الرئيسية"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """فحص صحة الخدمة"""
    llm = await get_llm()
    
    ollama_status = "unknown"
    if hasattr(llm, 'check_connection'):
        ollama_status = "connected" if await llm.check_connection() else "disconnected"
    else:
        ollama_status = "fallback"
    
    return {
        "status": "healthy",
        "ollama": ollama_status,
        "model": settings.OLLAMA_MODEL
    }


@app.get("/api/ai/models")
async def list_models():
    """قائمة النماذج المتوفرة"""
    llm = await get_llm()
    
    if hasattr(llm, 'list_models'):
        models = await llm.list_models()
        return {"models": models, "current": settings.OLLAMA_MODEL}
    
    return {"models": [], "current": "fallback"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
