"""
BI Management AI Engine - Task Routes
مسارات المهام
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from loguru import logger

from ..services.task_service import get_task_service

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskCreateRequest(BaseModel):
    """طلب إنشاء مهمة"""
    description: str = Field(..., min_length=5, max_length=2000, description="وصف المهمة")
    context: Optional[Dict[str, Any]] = Field(None, description="سياق إضافي")


class TaskResponse(BaseModel):
    """رد إنشاء المهمة"""
    id: str
    title: str
    description: str
    priority: str
    estimated_minutes: int
    suggested_department: Optional[str]
    tags: List[str]
    steps: List[str]
    source: str


class EmployeeInfo(BaseModel):
    """معلومات موظف"""
    id: str
    full_name: str
    department_code: Optional[str]
    pending_tasks_count: int = 0


class AssigneeSuggestionRequest(BaseModel):
    """طلب اقتراح موظف"""
    task: Dict[str, Any]
    available_employees: List[EmployeeInfo]


class TaskComplexityResponse(BaseModel):
    """رد تحليل التعقيد"""
    complexity_level: str
    complexity_label: str
    score: int
    factors: List[str]
    suggested_time_multiplier: float


@router.post("/create", response_model=TaskResponse)
async def create_task_from_description(request: TaskCreateRequest):
    """
    إنشاء مهمة من وصف نصي
    
    يقوم AI بتحليل الوصف وإنشاء:
    - عنوان مناسب
    - تحديد الأولوية
    - تقدير الوقت
    - اقتراح القسم
    - تقسيم لخطوات
    """
    try:
        task_service = await get_task_service()
        task = await task_service.create_task_from_description(
            description=request.description,
            context=request.context
        )
        
        return TaskResponse(**task)
        
    except Exception as e:
        logger.error(f"Task creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-assignee")
async def suggest_assignee(request: AssigneeSuggestionRequest):
    """
    اقتراح الموظف المناسب للمهمة
    """
    try:
        task_service = await get_task_service()
        suggestion = await task_service.suggest_assignee(
            task=request.task,
            available_employees=[e.dict() for e in request.available_employees]
        )
        
        if not suggestion:
            return {"suggestion": None, "message": "No suitable employee found"}
        
        return {"suggestion": suggestion}
        
    except Exception as e:
        logger.error(f"Assignee suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-complexity", response_model=TaskComplexityResponse)
async def analyze_task_complexity(task: Dict[str, Any]):
    """
    تحليل تعقيد المهمة
    """
    try:
        task_service = await get_task_service()
        complexity = await task_service.analyze_task_complexity(task)
        
        return TaskComplexityResponse(**complexity)
        
    except Exception as e:
        logger.error(f"Complexity analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/split")
async def split_task(task: Dict[str, Any]):
    """
    تقسيم مهمة كبيرة إلى مهام فرعية
    """
    try:
        task_service = await get_task_service()
        subtasks = await task_service.split_task(task)
        
        return {
            "original_task_id": task.get("id"),
            "subtasks": subtasks,
            "count": len(subtasks)
        }
        
    except Exception as e:
        logger.error(f"Task split error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
