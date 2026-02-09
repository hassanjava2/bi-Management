"""
BI Management - Camera AI Configuration
اعدادات نظام تحليل الكاميرات
"""

import os
from pydantic_settings import BaseSettings
from typing import List, Optional

class Settings(BaseSettings):
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = True
    
    # Backend API
    BACKEND_URL: str = "http://localhost:3000/api"
    API_KEY: str = "camera-ai-secret-key"
    
    # YOLO Model
    YOLO_MODEL: str = "yolov8n.pt"  # nano model for speed
    YOLO_CONFIDENCE: float = 0.5
    
    # Detection Settings
    IDLE_THRESHOLD_SECONDS: int = 300  # 5 minutes
    MESS_DETECTION_INTERVAL: int = 60  # check every 60 seconds
    SNAPSHOT_QUALITY: int = 85
    
    # Paths
    SNAPSHOTS_DIR: str = "snapshots"
    MODELS_DIR: str = "models"
    
    # Camera Settings
    RTSP_TIMEOUT: int = 10
    FRAME_SKIP: int = 5  # process every 5th frame
    
    # Alert Settings
    ALERT_COOLDOWN: int = 300  # 5 min between same alerts
    
    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Detection Types
DETECTION_TYPES = {
    "mess": "كشف الفوضى والأوساخ",
    "idle": "كشف الموظفين الخاملين",
    "products": "كشف المنتجات غير المرتبة",
    "safety": "كشف مخالفات السلامة",
    "crowd": "كشف الازدحام"
}

# Severity Levels
SEVERITY_LEVELS = {
    "low": {"priority": "low", "notify_manager": False},
    "medium": {"priority": "medium", "notify_manager": True},
    "high": {"priority": "high", "notify_manager": True},
    "critical": {"priority": "urgent", "notify_manager": True}
}

# Location Zones
LOCATION_ZONES = {
    "warehouse_a": "المستودع - المنطقة أ",
    "warehouse_b": "المستودع - المنطقة ب",
    "showroom": "صالة العرض",
    "reception": "الاستقبال",
    "office": "المكاتب",
    "entrance": "المدخل",
    "parking": "موقف السيارات"
}
