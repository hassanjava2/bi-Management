"""
BI Management AI Engine - Configuration
اعدادات محرك الذكاء الاصطناعي
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings"""
    
    # App Info
    APP_NAME: str = "BI AI Engine"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Ollama Configuration
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen3:8b"  # او llama3.2, deepseek-r1:8b
    OLLAMA_TIMEOUT: int = 120
    
    # Backend API
    BACKEND_URL: str = "http://localhost:3000/api"
    BACKEND_API_KEY: str = ""
    
    # Database
    DATABASE_PATH: str = "../data/bi_management.db"
    
    # Security
    JWT_SECRET: str = "your-super-secret-key-change-in-production"
    ENCRYPTION_KEY: str = "your-encryption-key-32chars!"
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/ai_engine.log"
    
    # Security Levels for Data Access
    # Level 1: موظف عادي - لا يرى بيانات حساسة
    # Level 2: موظف قديم - يرى بياناته فقط
    # Level 3: مشرف - يرى بيانات قسمه
    # Level 4: مدير - يرى معظم البيانات
    # Level 5: المالك/Admin - يرى كل شيء
    
    # Sensitive Data Patterns (لا يجوز الكشف عنها)
    BLOCKED_DATA_PATTERNS: list = [
        "purchase_price",      # سعر الشراء
        "profit_margin",       # هامش الربح
        "supplier_cost",       # تكلفة المورد
        "wholesale_price",     # سعر الجملة
    ]
    
    # Prompts Directory
    PROMPTS_DIR: str = "app/prompts"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


# Security Level Permissions
SECURITY_PERMISSIONS = {
    1: {
        "can_view_own_salary": False,
        "can_view_others_salary": False,
        "can_view_department_data": False,
        "can_view_financial_data": False,
        "can_view_purchase_prices": False,
    },
    2: {
        "can_view_own_salary": True,
        "can_view_others_salary": False,
        "can_view_department_data": False,
        "can_view_financial_data": False,
        "can_view_purchase_prices": False,
    },
    3: {
        "can_view_own_salary": True,
        "can_view_others_salary": False,
        "can_view_department_data": True,
        "can_view_financial_data": False,
        "can_view_purchase_prices": False,
    },
    4: {
        "can_view_own_salary": True,
        "can_view_others_salary": True,  # قسمه فقط
        "can_view_department_data": True,
        "can_view_financial_data": True,
        "can_view_purchase_prices": False,  # ممنوع دائماً
    },
    5: {
        "can_view_own_salary": True,
        "can_view_others_salary": True,
        "can_view_department_data": True,
        "can_view_financial_data": True,
        "can_view_purchase_prices": True,  # المالك فقط
    },
}

# Sensitive Query Keywords (Arabic & English)
SENSITIVE_KEYWORDS = {
    "salary": ["راتب", "رواتب", "salary", "salaries", "اجر", "معاش"],
    "purchase": ["سعر الشراء", "purchase price", "cost price", "تكلفة"],
    "profit": ["ربح", "هامش", "profit", "margin", "أرباح"],
    "financial": ["مالي", "ميزانية", "financial", "budget", "مصاريف"],
    "employee_data": ["بيانات الموظف", "معلومات شخصية", "personal data"],
}
