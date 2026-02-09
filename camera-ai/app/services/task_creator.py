"""
BI Management - Task Creator
إنشاء المهام من اكتشافات الكاميرات
"""

import logging
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.config import settings, DETECTION_TYPES, SEVERITY_LEVELS, LOCATION_ZONES

logger = logging.getLogger(__name__)


class TaskCreator:
    """
    Creates tasks in the main system based on camera detections
    """
    
    def __init__(self):
        self.backend_url = settings.BACKEND_URL
        self.api_key = settings.API_KEY
        
    async def create_task(self, task_data: Dict[str, Any]) -> Optional[Dict]:
        """
        Create a task in the backend system
        
        Args:
            task_data: Task details
            
        Returns:
            Created task or None if failed
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/tasks",
                    json=task_data,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "X-Source": "camera-ai"
                    },
                    timeout=10.0
                )
                
                if response.status_code in [200, 201]:
                    result = response.json()
                    logger.info(f"Task created: {result.get('data', {}).get('id')}")
                    return result.get("data")
                else:
                    logger.error(f"Failed to create task: {response.status_code} - {response.text}")
                    return None
                    
        except Exception as e:
            logger.error(f"Task creation error: {e}")
            return None
    
    async def create_cleaning_task(self, camera_id: str, 
                                   detection: Dict[str, Any],
                                   location: str = None) -> Optional[Dict]:
        """
        Create a cleaning task from mess detection
        """
        severity = detection.get("severity", "medium")
        severity_config = SEVERITY_LEVELS.get(severity, SEVERITY_LEVELS["medium"])
        location_name = LOCATION_ZONES.get(location, location or "موقع غير محدد")
        
        # Calculate due date based on severity
        hours_to_complete = {"low": 4, "medium": 2, "high": 1, "critical": 0.5}
        due_date = datetime.now() + timedelta(hours=hours_to_complete.get(severity, 2))
        
        task_data = {
            "title": f"تنظيف مطلوب - {location_name}",
            "description": self._generate_cleaning_description(detection, location_name),
            "priority": severity_config["priority"],
            "category": "cleaning",
            "department_id": "dept-maintenance",  # Should be configured
            "due_date": due_date.isoformat(),
            "source": "ai_camera",
            "source_reference": {
                "camera_id": camera_id,
                "detection_type": "mess",
                "severity": severity,
                "mess_score": detection.get("mess_score"),
                "snapshot": detection.get("snapshot_path"),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return await self.create_task(task_data)
    
    async def create_idle_warning(self, camera_id: str,
                                  detection: Dict[str, Any],
                                  employee_id: str = None) -> Optional[Dict]:
        """
        Create a warning/notification for idle employee
        """
        idle_minutes = detection.get("idle_duration", 0) // 60
        severity = detection.get("severity", "low")
        
        # This is more of a notification than a task
        # But can also create a check-in task for manager
        
        task_data = {
            "title": f"فحص موظف - توقف عن العمل لمدة {idle_minutes} دقيقة",
            "description": self._generate_idle_description(detection, idle_minutes),
            "priority": SEVERITY_LEVELS.get(severity, {}).get("priority", "low"),
            "category": "supervision",
            "department_id": "dept-hr",  # HR or direct manager
            "due_date": (datetime.now() + timedelta(hours=1)).isoformat(),
            "source": "ai_camera",
            "source_reference": {
                "camera_id": camera_id,
                "detection_type": "idle",
                "idle_duration": detection.get("idle_duration"),
                "employee_area": detection.get("employee_area"),
                "snapshot": detection.get("snapshot_path"),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return await self.create_task(task_data)
    
    async def create_organization_task(self, camera_id: str,
                                       detection: Dict[str, Any],
                                       location: str = None) -> Optional[Dict]:
        """
        Create a task for organizing products/items
        """
        location_name = LOCATION_ZONES.get(location, location or "المستودع")
        
        task_data = {
            "title": f"ترتيب المنتجات - {location_name}",
            "description": f"""
تم اكتشاف منتجات غير مرتبة في {location_name}.

المطلوب:
- إعادة ترتيب المنتجات المبعثرة
- التأكد من وضع كل منتج في مكانه الصحيح
- مراجعة تنظيم الأرفف

تم الاكتشاف بواسطة: نظام الكاميرات الذكي
            """.strip(),
            "priority": "medium",
            "category": "warehouse",
            "department_id": "dept-warehouse",
            "due_date": (datetime.now() + timedelta(hours=3)).isoformat(),
            "source": "ai_camera",
            "source_reference": {
                "camera_id": camera_id,
                "detection_type": "products",
                "snapshot": detection.get("snapshot_path"),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        return await self.create_task(task_data)
    
    async def send_notification(self, user_id: str, 
                               notification: Dict[str, Any]) -> bool:
        """
        Send a notification to user
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.backend_url}/notifications",
                    json={
                        "user_id": user_id,
                        "title": notification.get("title"),
                        "body": notification.get("body"),
                        "type": notification.get("type", "alert"),
                        "data": notification.get("data", {})
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    timeout=10.0
                )
                return response.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Notification error: {e}")
            return False
    
    def _generate_cleaning_description(self, detection: Dict, location: str) -> str:
        """Generate cleaning task description"""
        items = detection.get("items", [])
        items_text = ""
        if items:
            items_text = "\nالأشياء المكتشفة:\n" + "\n".join(
                f"- {item.get('type', 'غير محدد')}" for item in items[:5]
            )
        
        return f"""
تم اكتشاف فوضى/أوساخ في: {location}

مستوى الفوضى: {detection.get('mess_score', 'غير محدد')}/10
عدد العناصر المبعثرة: {detection.get('clutter_count', 0)}
{items_text}

المطلوب:
- تنظيف المنطقة المحددة
- إزالة الأشياء المبعثرة
- التأكد من نظافة الأرضية

تم الاكتشاف بواسطة: نظام الكاميرات الذكي
صورة مرفقة للتوضيح.
        """.strip()
    
    def _generate_idle_description(self, detection: Dict, idle_minutes: int) -> str:
        """Generate idle warning description"""
        return f"""
تم رصد توقف عن العمل في المنطقة: {detection.get('employee_area', 'غير محدد')}

مدة التوقف: {idle_minutes} دقيقة

المطلوب:
- التحقق من الموظف
- التأكد من عدم وجود مشكلة
- متابعة سير العمل

ملاحظة: هذا تنبيه آلي من نظام المراقبة الذكي.
يرجى التعامل بحكمة ومراعاة الظروف.
        """.strip()


# Singleton
task_creator = TaskCreator()
