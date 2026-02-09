"""
BI Management AI Engine - Analysis Service
خدمة تحليل البيانات
"""

from typing import Dict, List, Optional, Any
import json
import os
from loguru import logger

from ..models.llm import get_llm
from ..utils.security import get_security_service
from ..config import get_settings

settings = get_settings()


class AnalysisService:
    """
    خدمة تحليل البيانات بالذكاء الاصطناعي
    """
    
    def __init__(self):
        self.security = get_security_service()
        self.prompt_template = self._load_prompt()
    
    def _load_prompt(self) -> str:
        """تحميل قالب الـ Prompt"""
        prompt_path = os.path.join(settings.PROMPTS_DIR, "analysis.txt")
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            return self._get_default_prompt()
    
    def _get_default_prompt(self) -> str:
        return """حلل البيانات التالية:
{data}
قدم ملخصاً وتوصيات.
"""
    
    async def analyze(
        self,
        data: Any,
        analysis_type: str,
        user_security_level: int,
        context: Dict = None
    ) -> Dict:
        """
        تحليل بيانات مع مراعاة مستوى الأمان
        
        Args:
            data: البيانات للتحليل
            analysis_type: نوع التحليل (performance, attendance, tasks, etc.)
            user_security_level: مستوى أمان المستخدم
            context: سياق إضافي
        
        Returns:
            نتائج التحليل
        """
        # تنظيف البيانات من المعلومات الحساسة حسب مستوى الأمان
        cleaned_data = self._sanitize_data(data, user_security_level, analysis_type)
        
        prompt = self.prompt_template.format(
            security_level=user_security_level,
            analysis_type=analysis_type,
            data=json.dumps(cleaned_data, ensure_ascii=False, indent=2),
            context=json.dumps(context or {}, ensure_ascii=False)
        )
        
        llm = await get_llm()
        response = await llm.generate(prompt, temperature=0.5)
        
        # تنظيف الرد أيضاً
        response = self.security.sanitize_response(response, user_security_level)
        
        return {
            "analysis": response,
            "analysis_type": analysis_type,
            "data_points": len(cleaned_data) if isinstance(cleaned_data, list) else 1,
            "security_level_applied": user_security_level
        }
    
    def _sanitize_data(
        self, 
        data: Any, 
        security_level: int,
        analysis_type: str
    ) -> Any:
        """
        تنظيف البيانات حسب مستوى الأمان
        """
        sensitive_fields = [
            "salary", "راتب",
            "purchase_price", "سعر_الشراء",
            "profit_margin", "هامش_الربح",
            "cost", "تكلفة"
        ]
        
        # Level 5 يرى كل شيء
        if security_level >= 5:
            return data
        
        # للمستويات الأقل، أخفِ البيانات الحساسة
        if isinstance(data, dict):
            return self._clean_dict(data, sensitive_fields, security_level)
        elif isinstance(data, list):
            return [self._clean_dict(item, sensitive_fields, security_level) 
                   if isinstance(item, dict) else item for item in data]
        
        return data
    
    def _clean_dict(self, d: Dict, sensitive_fields: List[str], level: int) -> Dict:
        """تنظيف dictionary"""
        cleaned = {}
        for key, value in d.items():
            # التحقق من الحقول الحساسة
            key_lower = key.lower()
            is_sensitive = any(sf in key_lower for sf in sensitive_fields)
            
            if is_sensitive and level < 5:
                cleaned[key] = "[محجوب]"
            elif isinstance(value, dict):
                cleaned[key] = self._clean_dict(value, sensitive_fields, level)
            elif isinstance(value, list):
                cleaned[key] = [self._clean_dict(item, sensitive_fields, level) 
                               if isinstance(item, dict) else item for item in value]
            else:
                cleaned[key] = value
        
        return cleaned
    
    async def analyze_performance(
        self,
        employee_data: Dict,
        period: str,
        user_security_level: int
    ) -> Dict:
        """
        تحليل أداء موظف
        """
        # إعداد البيانات للتحليل
        analysis_data = {
            "tasks_completed": employee_data.get("tasks_completed", 0),
            "tasks_pending": employee_data.get("tasks_pending", 0),
            "on_time_rate": employee_data.get("on_time_rate", 0),
            "attendance_rate": employee_data.get("attendance_rate", 0),
            "late_count": employee_data.get("late_count", 0),
            "period": period
        }
        
        return await self.analyze(
            data=analysis_data,
            analysis_type="performance",
            user_security_level=user_security_level,
            context={"employee_name": employee_data.get("name", "الموظف")}
        )
    
    async def analyze_department(
        self,
        department_data: Dict,
        user_security_level: int
    ) -> Dict:
        """
        تحليل أداء قسم
        """
        return await self.analyze(
            data=department_data,
            analysis_type="department",
            user_security_level=user_security_level
        )
    
    async def analyze_attendance_trends(
        self,
        attendance_data: List[Dict],
        user_security_level: int
    ) -> Dict:
        """
        تحليل اتجاهات الحضور
        """
        # حساب إحصائيات
        total_days = len(attendance_data)
        present = sum(1 for a in attendance_data if a.get("status") == "present")
        late = sum(1 for a in attendance_data if a.get("status") == "late")
        absent = sum(1 for a in attendance_data if a.get("status") == "absent")
        
        summary = {
            "total_days": total_days,
            "present_days": present,
            "late_days": late,
            "absent_days": absent,
            "attendance_rate": round(present / total_days * 100, 1) if total_days > 0 else 0,
            "punctuality_rate": round((present) / (present + late) * 100, 1) if (present + late) > 0 else 0
        }
        
        return await self.analyze(
            data=summary,
            analysis_type="attendance_trends",
            user_security_level=user_security_level
        )
    
    async def analyze_tasks_workload(
        self,
        tasks_data: List[Dict],
        user_security_level: int
    ) -> Dict:
        """
        تحليل عبء العمل
        """
        # تجميع حسب الموظف
        by_employee = {}
        for task in tasks_data:
            emp_id = task.get("assigned_to", "unassigned")
            if emp_id not in by_employee:
                by_employee[emp_id] = {
                    "total": 0,
                    "completed": 0,
                    "overdue": 0
                }
            by_employee[emp_id]["total"] += 1
            if task.get("status") == "completed":
                by_employee[emp_id]["completed"] += 1
            if task.get("is_overdue"):
                by_employee[emp_id]["overdue"] += 1
        
        return await self.analyze(
            data=by_employee,
            analysis_type="workload",
            user_security_level=user_security_level
        )
    
    async def generate_insights(
        self,
        data_type: str,
        data: Any,
        user_security_level: int
    ) -> List[str]:
        """
        توليد رؤى (insights) من البيانات
        """
        result = await self.analyze(
            data=data,
            analysis_type=f"insights_{data_type}",
            user_security_level=user_security_level
        )
        
        # استخراج النقاط الرئيسية
        analysis = result.get("analysis", "")
        insights = []
        
        # تحليل بسيط للنص
        lines = analysis.split("\n")
        for line in lines:
            line = line.strip()
            if line.startswith("-") or line.startswith("•"):
                insights.append(line[1:].strip())
            elif line.startswith(("1.", "2.", "3.", "4.", "5.")):
                insights.append(line[2:].strip())
        
        return insights[:5]  # أول 5 نقاط


# Singleton
_analysis_service = None

async def get_analysis_service() -> AnalysisService:
    global _analysis_service
    if _analysis_service is None:
        _analysis_service = AnalysisService()
    return _analysis_service
