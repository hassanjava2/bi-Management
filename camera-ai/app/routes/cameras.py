"""
BI Management - Camera Routes
مسارات إدارة الكاميرات
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
import uuid

from app.services.camera_service import camera_manager
from app.services.detection_service import detection_service
from app.services.alert_service import alert_service

router = APIRouter(prefix="/cameras", tags=["Cameras"])


class CameraCreate(BaseModel):
    name: str
    rtsp_url: str
    location: str
    detection_types: List[str] = ["idle", "mess"]


class CameraUpdate(BaseModel):
    name: Optional[str] = None
    rtsp_url: Optional[str] = None
    location: Optional[str] = None
    detection_types: Optional[List[str]] = None
    is_active: Optional[bool] = None


@router.get("/")
async def list_cameras():
    """List all cameras"""
    cameras = camera_manager.list_cameras()
    return {
        "success": True,
        "data": [
            {
                "id": cam.id,
                "name": cam.name,
                "location": cam.location,
                "is_active": cam.is_active,
                "is_connected": cam.is_connected,
                "detection_types": cam.detection_types
            }
            for cam in cameras
        ]
    }


@router.post("/")
async def add_camera(camera: CameraCreate):
    """Add a new camera"""
    camera_id = str(uuid.uuid4())[:8]
    
    new_camera = camera_manager.add_camera(
        camera_id=camera_id,
        name=camera.name,
        rtsp_url=camera.rtsp_url,
        location=camera.location,
        detection_types=camera.detection_types
    )
    
    return {
        "success": True,
        "data": {
            "id": new_camera.id,
            "name": new_camera.name,
            "location": new_camera.location,
            "detection_types": new_camera.detection_types
        },
        "message": "Camera added successfully"
    }


@router.get("/{camera_id}")
async def get_camera(camera_id: str):
    """Get camera details"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    return {
        "success": True,
        "data": camera_manager.get_status(camera_id)
    }


@router.delete("/{camera_id}")
async def delete_camera(camera_id: str):
    """Remove a camera"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera_manager.remove_camera(camera_id)
    
    return {
        "success": True,
        "message": "Camera removed successfully"
    }


@router.post("/{camera_id}/connect")
async def connect_camera(camera_id: str):
    """Connect to camera RTSP stream"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    success = camera_manager.connect(camera_id)
    
    if success:
        return {"success": True, "message": "Connected to camera"}
    else:
        raise HTTPException(status_code=500, detail="Failed to connect to camera")


@router.post("/{camera_id}/disconnect")
async def disconnect_camera(camera_id: str):
    """Disconnect from camera"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    camera_manager.disconnect(camera_id)
    
    return {"success": True, "message": "Disconnected from camera"}


@router.get("/{camera_id}/snapshot")
async def get_snapshot(camera_id: str):
    """Get current frame snapshot as base64"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    if not camera.is_connected:
        raise HTTPException(status_code=400, detail="Camera not connected")
    
    snapshot = camera_manager.get_snapshot_base64(camera_id)
    
    if snapshot:
        return {
            "success": True,
            "data": {
                "image": snapshot,
                "camera_id": camera_id,
                "format": "jpeg"
            }
        }
    else:
        raise HTTPException(status_code=500, detail="Failed to capture snapshot")


@router.get("/{camera_id}/status")
async def get_camera_status(camera_id: str):
    """Get detailed camera status"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    return {
        "success": True,
        "data": camera_manager.get_status(camera_id)
    }


@router.post("/{camera_id}/start-analysis")
async def start_analysis(camera_id: str, background_tasks: BackgroundTasks):
    """Start continuous analysis for camera"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    # Connect if not connected
    if not camera.is_connected:
        if not camera_manager.connect(camera_id):
            raise HTTPException(status_code=500, detail="Failed to connect to camera")
    
    # Start capture
    camera_manager.start_capture(camera_id)
    
    # Start analysis in background
    async def run_analysis():
        await detection_service.start_continuous_analysis(
            camera_id,
            camera_manager,
            on_alert=alert_service.process_alert
        )
    
    background_tasks.add_task(run_analysis)
    
    return {
        "success": True,
        "message": f"Analysis started for camera: {camera.name}"
    }


@router.post("/{camera_id}/stop-analysis")
async def stop_analysis(camera_id: str):
    """Stop continuous analysis for camera"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    detection_service.stop_analysis()
    camera_manager.stop_capture(camera_id)
    
    return {
        "success": True,
        "message": f"Analysis stopped for camera: {camera.name}"
    }


@router.get("/{camera_id}/detections")
async def get_detections(camera_id: str, limit: int = 50):
    """Get recent detections for camera"""
    camera = camera_manager.get_camera(camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")
    
    history = detection_service.get_history(camera_id, limit)
    
    return {
        "success": True,
        "data": history
    }
