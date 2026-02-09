"""
BI Management AI Engine - Analysis Routes
مسارات التحليل
"""

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from loguru import logger
import json

from ..services.analysis_service import get_analysis_service

router = APIRouter(prefix="/analysis", tags=["Analysis"])


class AnalysisRequest(BaseModel):
    """طلب تحليل"""
    data: Any = Field(..., description="البيانات للتحليل")
    analysis_type: str = Field(..., description="نوع التحليل")
    context: Optional[Dict[str, Any]] = Field(None, description="سياق إضافي")


class PerformanceRequest(BaseModel):
    """طلب تحليل أداء"""
    employee_data: Dict[str, Any]
    period: str = Field("month", description="الفترة: week, month, year")


class AttendanceRequest(BaseModel):
    """طلب تحليل حضور"""
    attendance_data: List[Dict[str, Any]]


class WorkloadRequest(BaseModel):
    """طلب تحليل عبء العمل"""
    tasks_data: List[Dict[str, Any]]


class InsightsRequest(BaseModel):
    """طلب رؤى"""
    data_type: str
    data: Any


def get_security_level(x_security_level: str = Header("1")) -> int:
    """استخراج مستوى الأمان من الهيدر"""
    try:
        level = int(x_security_level)
        return max(1, min(5, level))
    except:
        return 1


@router.post("/general")
async def general_analysis(
    request: AnalysisRequest,
    x_security_level: str = Header("1")
):
    """
    تحليل عام للبيانات
    
    - **data**: البيانات للتحليل (dict أو list)
    - **analysis_type**: نوع التحليل
    - **context**: سياق إضافي
    """
    try:
        security_level = get_security_level(x_security_level)
        
        analysis_service = await get_analysis_service()
        result = await analysis_service.analyze(
            data=request.data,
            analysis_type=request.analysis_type,
            user_security_level=security_level,
            context=request.context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/performance")
async def analyze_performance(
    request: PerformanceRequest,
    x_security_level: str = Header("1")
):
    """
    تحليل أداء موظف
    """
    try:
        security_level = get_security_level(x_security_level)
        
        analysis_service = await get_analysis_service()
        result = await analysis_service.analyze_performance(
            employee_data=request.employee_data,
            period=request.period,
            user_security_level=security_level
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Performance analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance")
async def analyze_attendance(
    request: AttendanceRequest,
    x_security_level: str = Header("1")
):
    """
    تحليل اتجاهات الحضور
    """
    try:
        security_level = get_security_level(x_security_level)
        
        analysis_service = await get_analysis_service()
        result = await analysis_service.analyze_attendance_trends(
            attendance_data=request.attendance_data,
            user_security_level=security_level
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Attendance analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/workload")
async def analyze_workload(
    request: WorkloadRequest,
    x_security_level: str = Header("1")
):
    """
    تحليل عبء العمل
    """
    try:
        security_level = get_security_level(x_security_level)
        
        analysis_service = await get_analysis_service()
        result = await analysis_service.analyze_tasks_workload(
            tasks_data=request.tasks_data,
            user_security_level=security_level
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Workload analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
async def generate_insights(
    request: InsightsRequest,
    x_security_level: str = Header("1")
):
    """
    توليد رؤى من البيانات
    """
    try:
        security_level = get_security_level(x_security_level)
        
        analysis_service = await get_analysis_service()
        insights = await analysis_service.generate_insights(
            data_type=request.data_type,
            data=request.data,
            user_security_level=security_level
        )
        
        return {
            "insights": insights,
            "count": len(insights)
        }
        
    except Exception as e:
        logger.error(f"Insights generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
