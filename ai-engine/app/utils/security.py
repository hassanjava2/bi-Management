"""
BI Management AI Engine - Security Utilities
أدوات الأمان والتحقق من الصلاحيات
"""

import re
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from loguru import logger

from ..config import get_settings, SECURITY_PERMISSIONS, SENSITIVE_KEYWORDS

settings = get_settings()


class SecurityService:
    """
    خدمة الأمان - تتحقق من صلاحيات المستخدم قبل الإجابة
    """
    
    def __init__(self, db_connection=None):
        self.db = db_connection
        self.security_logs = []
    
    def get_user_permissions(self, security_level: int) -> Dict:
        """جلب صلاحيات المستخدم حسب مستوى الأمان"""
        if security_level < 1:
            security_level = 1
        if security_level > 5:
            security_level = 5
        return SECURITY_PERMISSIONS.get(security_level, SECURITY_PERMISSIONS[1])
    
    def detect_sensitive_query(self, query: str) -> Tuple[bool, str, str]:
        """
        الكشف عن الأسئلة الحساسة
        
        Returns:
            (is_sensitive, category, detected_keyword)
        """
        query_lower = query.lower()
        
        for category, keywords in SENSITIVE_KEYWORDS.items():
            for keyword in keywords:
                if keyword.lower() in query_lower:
                    logger.warning(f"Sensitive query detected: {category} - {keyword}")
                    return True, category, keyword
        
        # التحقق من أنماط إضافية
        sensitive_patterns = [
            (r"كم\s*(راتب|معاش|اجر)", "salary", "كم راتب"),
            (r"اعطني\s*(رواتب|قائمة الرواتب)", "salary", "قائمة الرواتب"),
            (r"سعر\s*(الشراء|التكلفة)", "purchase", "سعر الشراء"),
            (r"هامش\s*(الربح|ربح)", "profit", "هامش الربح"),
            (r"(profit|margin|cost)\s*price", "purchase", "cost price"),
            (r"how much.*(earn|salary|make)", "salary", "salary inquiry"),
        ]
        
        for pattern, category, description in sensitive_patterns:
            if re.search(pattern, query_lower):
                logger.warning(f"Sensitive pattern detected: {category} - {description}")
                return True, category, description
        
        return False, "", ""
    
    def check_query_permission(
        self, 
        user_id: str,
        user_level: int, 
        query: str, 
        requested_data_type: str = None,
        target_user_id: str = None,
        target_department_id: str = None
    ) -> Tuple[bool, str]:
        """
        التحقق من صلاحية المستخدم للوصول للبيانات المطلوبة
        
        Args:
            user_id: معرف المستخدم الذي يسأل
            user_level: مستوى الأمان (1-5)
            query: السؤال
            requested_data_type: نوع البيانات المطلوبة
            target_user_id: معرف الشخص المسؤول عنه (إن وجد)
            target_department_id: معرف القسم المطلوب
        
        Returns:
            (is_allowed, reason)
        """
        permissions = self.get_user_permissions(user_level)
        
        # 1. فحص البيانات الممنوعة تماماً
        is_sensitive, category, keyword = self.detect_sensitive_query(query)
        
        if is_sensitive:
            # التحقق من الصلاحية حسب الفئة
            if category == "salary":
                # هل يسأل عن راتبه؟
                if target_user_id and target_user_id == user_id:
                    if not permissions["can_view_own_salary"]:
                        return False, "لا تملك صلاحية الاطلاع على بيانات الراتب"
                else:
                    if not permissions["can_view_others_salary"]:
                        return False, "لا تملك صلاحية الاطلاع على رواتب الآخرين"
            
            elif category == "purchase":
                if not permissions["can_view_purchase_prices"]:
                    return False, "أسعار الشراء معلومات سرية لا يمكن الإفصاح عنها"
            
            elif category == "profit":
                if not permissions["can_view_purchase_prices"]:
                    return False, "معلومات هوامش الربح سرية"
            
            elif category == "financial":
                if not permissions["can_view_financial_data"]:
                    return False, "لا تملك صلاحية الاطلاع على البيانات المالية"
        
        # 2. التحقق من صلاحية القسم
        if target_department_id and not permissions["can_view_department_data"]:
            return False, "لا تملك صلاحية الاطلاع على بيانات هذا القسم"
        
        return True, "مسموح"
    
    def sanitize_response(self, response: str, user_level: int) -> str:
        """
        تنظيف الرد من أي معلومات حساسة قد تتسرب
        """
        permissions = self.get_user_permissions(user_level)
        
        # إزالة أرقام تشبه الرواتب إذا لم يكن مصرحاً
        if not permissions["can_view_others_salary"]:
            # إزالة أنماط الرواتب (مبالغ بالدينار)
            response = re.sub(
                r'\b\d{3,},?\d{3}?\s*(دينار|IQD|د\.ع)', 
                '[مبلغ محجوب]', 
                response
            )
        
        # إزالة أسعار الشراء
        if not permissions["can_view_purchase_prices"]:
            response = re.sub(
                r'(سعر الشراء|تكلفة|cost|purchase price)[:\s]*[\d,\.]+',
                '[معلومات سرية]',
                response,
                flags=re.IGNORECASE
            )
        
        return response
    
    def log_security_event(
        self, 
        user_id: str, 
        query: str, 
        blocked: bool, 
        reason: str,
        category: str = None
    ) -> Dict:
        """
        تسجيل حدث أمني
        """
        event = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "query": query[:500],  # تقليص الطول
            "blocked": blocked,
            "reason": reason,
            "category": category,
        }
        
        self.security_logs.append(event)
        
        # تسجيل في الـ log
        if blocked:
            logger.warning(f"Security: Blocked query from {user_id}: {reason}")
        else:
            logger.info(f"Security: Allowed query from {user_id}")
        
        return event
    
    def get_polite_rejection(self, category: str) -> str:
        """
        الحصول على رد مهذب لرفض السؤال
        """
        rejections = {
            "salary": "عذراً، لا أستطيع الإفصاح عن معلومات الرواتب. يرجى التواصل مع قسم الموارد البشرية للاستفسارات المتعلقة بالرواتب.",
            "purchase": "عذراً، أسعار الشراء معلومات تجارية سرية. يمكنني مساعدتك في أمور أخرى.",
            "profit": "عذراً، معلومات هوامش الربح سرية ومحصورة بالإدارة العليا.",
            "financial": "عذراً، لا أملك صلاحية مشاركة البيانات المالية. يرجى التواصل مع قسم المحاسبة.",
            "default": "عذراً، لا أستطيع الإجابة على هذا السؤال. هل يمكنني مساعدتك في شيء آخر؟"
        }
        
        return rejections.get(category, rejections["default"])
    
    def analyze_query_intent(self, query: str) -> Dict:
        """
        تحليل نية السؤال
        """
        intents = {
            "greeting": ["مرحبا", "السلام عليكم", "صباح الخير", "مساء الخير", "hello", "hi"],
            "help": ["مساعدة", "ساعدني", "help", "كيف", "how"],
            "task": ["مهمة", "task", "عمل", "شغل"],
            "attendance": ["حضور", "انصراف", "غياب", "attendance"],
            "vacation": ["اجازة", "عطلة", "vacation", "leave"],
            "complaint": ["شكوى", "مشكلة", "complaint", "issue"],
            "question": ["سؤال", "استفسار", "question"],
        }
        
        query_lower = query.lower()
        detected_intents = []
        
        for intent, keywords in intents.items():
            for keyword in keywords:
                if keyword in query_lower:
                    detected_intents.append(intent)
                    break
        
        return {
            "intents": detected_intents,
            "primary_intent": detected_intents[0] if detected_intents else "unknown",
            "query": query
        }


# Singleton instance
_security_service = None

def get_security_service(db_connection=None) -> SecurityService:
    global _security_service
    if _security_service is None:
        _security_service = SecurityService(db_connection)
    return _security_service
