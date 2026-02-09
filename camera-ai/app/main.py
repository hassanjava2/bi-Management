"""
BI Management - Camera AI Main Application
التطبيق الرئيسي لنظام تحليل الكاميرات
"""

import logging
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routes.cameras import router as cameras_router
from app.routes.analysis import router as analysis_router
from app.services.camera_service import camera_manager
from app.services.alert_service import alert_service

# Configure logging
logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("=" * 50)
    logger.info("BI Camera AI System Starting...")
    logger.info(f"Backend URL: {settings.BACKEND_URL}")
    logger.info("=" * 50)
    
    # Start alert processing
    asyncio.create_task(alert_service.start_processing())
    
    yield
    
    # Shutdown
    logger.info("Shutting down Camera AI System...")
    camera_manager.stop_all()
    alert_service.stop_processing()
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="BI Camera AI",
    description="نظام تحليل الكاميرات بالذكاء الاصطناعي - BI Management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "INTERNAL_ERROR",
            "message": str(exc) if settings.DEBUG else "Internal server error"
        }
    )


# Health check
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "camera-ai",
        "version": "1.0.0",
        "cameras_count": len(camera_manager.cameras),
        "active_cameras": len([c for c in camera_manager.cameras.values() if c.is_connected])
    }


# Root endpoint
@app.get("/")
async def root():
    """API information"""
    return {
        "name": "BI Camera AI",
        "description": "نظام تحليل الكاميرات بالذكاء الاصطناعي",
        "version": "1.0.0",
        "endpoints": {
            "cameras": "/api/cameras",
            "analysis": "/api/analysis",
            "health": "/health",
            "docs": "/docs"
        }
    }


# Include routers
app.include_router(cameras_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")


# Run with: uvicorn app.main:app --reload --port 8001
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
