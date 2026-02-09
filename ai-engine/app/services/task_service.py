"""
BI Management AI Engine - Task Service
خدمة إنشاء المهام بالذكاء الاصطناعي
"""

from typing import Dict, List, Optional
import json
import os
from loguru import logger

from ..models.llm import get_llm
from ..utils.helpers import generate_id, extract_json_from_text
from ..config import get_settings

settings = get_settings()


class TaskService:
    """
    خدمة إنشاء وتحليل المهام
    """
    
    def __init__(self):
        self.prompt_template = self._load_prompt()
    
    def _load_prompt(self) -> str:
        """تحميل قالب الـ Prompt"""
        prompt_path = os.path.join(settings.PROMPTS_DIR, "task_creation.txt")
        try:
            with open(prompt_path, 'r', encoding='utf-8') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"Prompt file not found: {prompt_path}")
            return self._get_default_prompt()
    
    def _get_default_prompt(self) -> str:
        """Prompt افتراضي"""
        return """حوّل الوصف التالي إلى مهمة JSON:
الوصف: {task_description}
أجب بـ JSON فقط:
{{"title": "...", "description": "...", "priority": "medium", "estimated_minutes": 60}}
"""
    
    async def create_task_from_description(
        self,
        description: str,
        context: Dict = None
    ) -> Dict:
        """
        إنشاء مهمة من وصف نصي
        
        Args:
            description: وصف المهمة بالعربي
            context: سياق إضافي (معلومات المشروع، الموظف، الخ)
        
        Returns:
            Task object with suggested values
        """
        prompt = self.prompt_template.format(
            task_description=description,
            context=json.dumps(context or {}, ensure_ascii=False)
        )
        
        llm = await get_llm()
        response = await llm.generate(prompt, temperature=0.3)
        
        # استخراج JSON من الرد
        task = extract_json_from_text(response)
        
        if task is None:
            # محاولة تحليل يدوي
            task = self._parse_task_manually(description, response)
        
        # إضافة معرف
        task["id"] = generate_id()
        task["source"] = "ai_generated"
        task["original_description"] = description
        
        # التأكد من وجود الحقول المطلوبة
        task = self._ensure_required_fields(task)
        
        return task
    
    def _parse_task_manually(self, description: str, response: str) -> Dict:
        """تحليل يدوي للمهمة إذا فشل JSON"""
        # تحليل بسيط
        task = {
            "title": description[:50] if len(description) > 50 else description,
            "description": description,
            "priority": "medium",
            "estimated_minutes": 60,
            "tags": [],
            "steps": []
        }
        
        # محاولة استخراج الأولوية من الوصف
        desc_lower = description.lower()
        if any(w in desc_lower for w in ["عاجل", "urgent", "فوري", "طارئ"]):
            task["priority"] = "urgent"
        elif any(w in desc_lower for w in ["مهم", "important", "ضروري"]):
            task["priority"] = "high"
        elif any(w in desc_lower for w in ["بسيط", "سهل", "simple"]):
            task["priority"] = "low"
        
        return task
    
    def _ensure_required_fields(self, task: Dict) -> Dict:
        """التأكد من وجود الحقول المطلوبة"""
        defaults = {
            "title": "مهمة جديدة",
            "description": "",
            "priority": "medium",
            "estimated_minutes": 60,
            "suggested_department": None,
            "tags": [],
            "steps": [],
            "assigned_to_suggestion": None
        }
        
        for key, default in defaults.items():
            if key not in task:
                task[key] = default
        
        return task
    
    async def suggest_assignee(
        self,
        task: Dict,
        available_employees: List[Dict]
    ) -> Optional[Dict]:
        """
        اقتراح الموظف المناسب للمهمة
        
        Args:
            task: المهمة
            available_employees: قائمة الموظفين المتاحين
        
        Returns:
            الموظف المقترح مع السبب
        """
        if not available_employees:
            return None
        
        # تصفية حسب القسم
        department = task.get("suggested_department")
        if department:
            filtered = [e for e in available_employees 
                       if e.get("department_code") == department]
            if filtered:
                available_employees = filtered
        
        # تصفية حسب عبء العمل (الأقل مهام)
        sorted_employees = sorted(
            available_employees,
            key=lambda e: e.get("pending_tasks_count", 0)
        )
        
        if sorted_employees:
            suggested = sorted_employees[0]
            return {
                "employee_id": suggested.get("id"),
                "employee_name": suggested.get("full_name"),
                "reason": f"أقل عبء عمل ({suggested.get('pending_tasks_count', 0)} مهام معلقة)",
                "department": suggested.get("department_name")
            }
        
        return None
    
    async def analyze_task_complexity(self, task: Dict) -> Dict:
        """
        تحليل تعقيد المهمة
        """
        description = task.get("description", "")
        steps = task.get("steps", [])
        
        # حساب التعقيد
        complexity_score = 0
        factors = []
        
        # عدد الخطوات
        if len(steps) > 5:
            complexity_score += 2
            factors.append("عدد خطوات كبير")
        elif len(steps) > 2:
            complexity_score += 1
            factors.append("عدة خطوات")
        
        # طول الوصف
        if len(description) > 500:
            complexity_score += 1
            factors.append("وصف مفصل")
        
        # كلمات دالة على التعقيد
        complex_words = ["تكامل", "integration", "تحليل", "analysis", "أمان", "security"]
        for word in complex_words:
            if word in description.lower():
                complexity_score += 1
                factors.append(f"يتضمن: {word}")
                break
        
        # تحديد المستوى
        if complexity_score >= 4:
            level = "high"
            label = "معقدة"
        elif complexity_score >= 2:
            level = "medium"
            label = "متوسطة"
        else:
            level = "low"
            label = "بسيطة"
        
        return {
            "complexity_level": level,
            "complexity_label": label,
            "score": complexity_score,
            "factors": factors,
            "suggested_time_multiplier": 1 + (complexity_score * 0.25)
        }
    
    async def split_task(self, task: Dict) -> List[Dict]:
        """
        تقسيم مهمة كبيرة إلى مهام فرعية
        """
        steps = task.get("steps", [])
        
        if len(steps) < 2:
            return [task]
        
        subtasks = []
        parent_id = task.get("id", generate_id())
        
        for i, step in enumerate(steps):
            subtask = {
                "id": generate_id(),
                "parent_task_id": parent_id,
                "title": step if len(step) < 50 else step[:47] + "...",
                "description": step,
                "priority": task.get("priority", "medium"),
                "estimated_minutes": task.get("estimated_minutes", 60) // len(steps),
                "order": i + 1,
                "source": "ai_split"
            }
            subtasks.append(subtask)
        
        return subtasks


# Singleton
_task_service = None

async def get_task_service() -> TaskService:
    global _task_service
    if _task_service is None:
        _task_service = TaskService()
    return _task_service
