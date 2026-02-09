"""
BI Management AI Engine - Helper Utilities
أدوات مساعدة
"""

import uuid
from datetime import datetime, date
from typing import Any, Dict, List, Optional
import json
import re


def generate_id() -> str:
    """إنشاء معرف فريد"""
    return str(uuid.uuid4())


def now() -> str:
    """الوقت الحالي بصيغة ISO"""
    return datetime.now().isoformat()


def today() -> str:
    """تاريخ اليوم"""
    return date.today().isoformat()


def clean_text(text: str) -> str:
    """تنظيف النص"""
    if not text:
        return ""
    # إزالة المسافات الزائدة
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def truncate_text(text: str, max_length: int = 500) -> str:
    """اقتطاع النص"""
    if len(text) <= max_length:
        return text
    return text[:max_length-3] + "..."


def parse_json_safely(text: str) -> Optional[Dict]:
    """تحليل JSON بأمان"""
    try:
        return json.loads(text)
    except:
        return None


def extract_json_from_text(text: str) -> Optional[Dict]:
    """استخراج JSON من نص يحتوي على نص عادي + JSON"""
    # البحث عن JSON block
    json_match = re.search(r'\{[^{}]*\}', text, re.DOTALL)
    if json_match:
        return parse_json_safely(json_match.group())
    return None


def format_date_arabic(date_str: str) -> str:
    """تنسيق التاريخ بالعربي"""
    try:
        dt = datetime.fromisoformat(date_str)
        months = [
            "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ]
        return f"{dt.day} {months[dt.month-1]} {dt.year}"
    except:
        return date_str


def format_time_arabic(time_str: str) -> str:
    """تنسيق الوقت بالعربي"""
    try:
        if 'T' in time_str:
            time_str = time_str.split('T')[1][:5]
        return time_str
    except:
        return time_str


def calculate_duration_minutes(start: str, end: str) -> int:
    """حساب المدة بالدقائق"""
    try:
        start_dt = datetime.fromisoformat(start)
        end_dt = datetime.fromisoformat(end)
        return int((end_dt - start_dt).total_seconds() / 60)
    except:
        return 0


def format_duration(minutes: int) -> str:
    """تنسيق المدة"""
    if minutes < 60:
        return f"{minutes} دقيقة"
    hours = minutes // 60
    mins = minutes % 60
    if mins == 0:
        return f"{hours} ساعة"
    return f"{hours} ساعة و {mins} دقيقة"


def detect_language(text: str) -> str:
    """الكشف عن لغة النص"""
    arabic_pattern = re.compile(r'[\u0600-\u06FF]')
    if arabic_pattern.search(text):
        return "ar"
    return "en"


def normalize_arabic(text: str) -> str:
    """تطبيع النص العربي"""
    # توحيد الألف
    text = re.sub(r'[إأآا]', 'ا', text)
    # توحيد الهاء والتاء المربوطة
    text = re.sub(r'[ة]', 'ه', text)
    # إزالة التشكيل
    text = re.sub(r'[\u064B-\u065F]', '', text)
    return text


def extract_numbers(text: str) -> List[float]:
    """استخراج الأرقام من النص"""
    numbers = re.findall(r'[\d,]+\.?\d*', text)
    result = []
    for n in numbers:
        try:
            result.append(float(n.replace(',', '')))
        except:
            pass
    return result


def mask_sensitive_data(data: Dict, fields: List[str]) -> Dict:
    """إخفاء البيانات الحساسة"""
    masked = data.copy()
    for field in fields:
        if field in masked:
            masked[field] = "***"
    return masked


def validate_uuid(value: str) -> bool:
    """التحقق من صحة UUID"""
    try:
        uuid.UUID(value)
        return True
    except:
        return False


def get_greeting() -> str:
    """تحية حسب الوقت"""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "صباح الخير"
    elif 12 <= hour < 17:
        return "مساء الخير"
    elif 17 <= hour < 21:
        return "مساء الخير"
    else:
        return "مرحباً"


def estimate_reading_time(text: str) -> int:
    """تقدير وقت القراءة بالثواني"""
    words = len(text.split())
    # متوسط 200 كلمة بالدقيقة
    return max(5, int(words / 200 * 60))
