"""
BI Management - Analysis Routes
مسارات التحليل والإحصائيات
"""

from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
import base64
import io

from app.services.detection_service import detection_service
from app.services.alert_service import alert_service
from app.models.yolo_detector import get_detector

router = APIRouter(prefix="/analysis", tags=["Analysis"])

# Try to import image processing
try:
    import cv2
    import numpy as np
    from PIL import Image
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False


class AnalyzeImageRequest(BaseModel):
    image_base64: str
    camera_id: Optional[str] = "manual"
    detection_types: List[str] = ["idle", "mess"]


@router.post("/image")
async def analyze_image(request: AnalyzeImageRequest):
    """
    Analyze a single image (base64 encoded)
    """
    if not CV2_AVAILABLE:
        raise HTTPException(
            status_code=500, 
            detail="Image processing not available. Install opencv-python."
        )
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(request.image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image data")
        
        # Run analysis
        results = await detection_service.analyze_frame(
            request.camera_id,
            frame,
            request.detection_types
        )
        
        return {
            "success": True,
            "data": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def analyze_upload(
    file: UploadFile = File(...),
    camera_id: str = "manual"
):
    """
    Analyze an uploaded image file
    """
    if not CV2_AVAILABLE:
        raise HTTPException(
            status_code=500,
            detail="Image processing not available"
        )
    
    try:
        # Read file
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image file")
        
        # Run analysis
        results = await detection_service.analyze_frame(
            camera_id,
            frame,
            ["idle", "mess", "products"]
        )
        
        return {
            "success": True,
            "data": results,
            "filename": file.filename
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_statistics(camera_id: Optional[str] = None):
    """
    Get detection statistics
    """
    detection_stats = detection_service.get_statistics(camera_id)
    alert_stats = alert_service.get_statistics()
    
    return {
        "success": True,
        "data": {
            "detections": detection_stats,
            "alerts": alert_stats
        }
    }


@router.get("/alerts")
async def get_alerts(
    camera_id: Optional[str] = None,
    alert_type: Optional[str] = None,
    limit: int = 50
):
    """
    Get alert history
    """
    alerts = alert_service.get_history(camera_id, alert_type, limit)
    
    return {
        "success": True,
        "data": alerts
    }


@router.get("/history")
async def get_detection_history(
    camera_id: Optional[str] = None,
    limit: int = 100
):
    """
    Get detection history
    """
    history = detection_service.get_history(camera_id, limit)
    
    return {
        "success": True,
        "data": history
    }


@router.post("/detect-objects")
async def detect_objects(request: AnalyzeImageRequest):
    """
    Run pure object detection on image
    """
    if not CV2_AVAILABLE:
        raise HTTPException(status_code=500, detail="OpenCV not available")
    
    try:
        # Decode image
        image_data = base64.b64decode(request.image_base64)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            raise HTTPException(status_code=400, detail="Invalid image")
        
        # Run detection
        detector = get_detector()
        detections = detector.detect(frame)
        
        return {
            "success": True,
            "data": {
                "detections": detections,
                "total_objects": len(detections),
                "persons": len([d for d in detections if d.get("class_id") == 0])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/model-info")
async def get_model_info():
    """
    Get information about the detection model
    """
    detector = get_detector()
    
    return {
        "success": True,
        "data": {
            "model": detector.model_path,
            "confidence_threshold": detector.confidence,
            "available_classes": list(detector.RELEVANT_CLASSES.values()),
            "model_loaded": detector.model is not None
        }
    }
