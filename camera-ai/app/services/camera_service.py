"""
BI Management - Camera Service
خدمة إدارة الكاميرات واتصالات RTSP
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
import threading
import base64
import io

logger = logging.getLogger(__name__)

# Try to import OpenCV
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False
    logger.warning("OpenCV not available - camera functions will be limited")


@dataclass
class Camera:
    """Camera configuration and state"""
    id: str
    name: str
    rtsp_url: str
    location: str
    detection_types: List[str] = field(default_factory=list)
    is_active: bool = True
    is_connected: bool = False
    last_frame_time: float = 0
    error_count: int = 0
    fps: float = 0


class CameraService:
    """
    Manages camera connections and frame capture
    """
    
    def __init__(self):
        self.cameras: Dict[str, Camera] = {}
        self.captures: Dict[str, Any] = {}  # cv2.VideoCapture instances
        self._running = False
        self._capture_threads: Dict[str, threading.Thread] = {}
        self._frame_buffers: Dict[str, np.ndarray] = {}
        self._lock = threading.Lock()
    
    def add_camera(self, camera_id: str, name: str, rtsp_url: str, 
                   location: str, detection_types: List[str] = None) -> Camera:
        """Add a new camera"""
        camera = Camera(
            id=camera_id,
            name=name,
            rtsp_url=rtsp_url,
            location=location,
            detection_types=detection_types or ["idle", "mess"]
        )
        self.cameras[camera_id] = camera
        logger.info(f"Camera added: {name} ({camera_id})")
        return camera
    
    def remove_camera(self, camera_id: str):
        """Remove a camera"""
        self.stop_capture(camera_id)
        if camera_id in self.cameras:
            del self.cameras[camera_id]
            logger.info(f"Camera removed: {camera_id}")
    
    def get_camera(self, camera_id: str) -> Optional[Camera]:
        """Get camera by ID"""
        return self.cameras.get(camera_id)
    
    def list_cameras(self) -> List[Camera]:
        """List all cameras"""
        return list(self.cameras.values())
    
    def connect(self, camera_id: str) -> bool:
        """Connect to camera RTSP stream"""
        if not CV2_AVAILABLE:
            logger.error("OpenCV not available for camera connection")
            return False
            
        camera = self.cameras.get(camera_id)
        if not camera:
            logger.error(f"Camera not found: {camera_id}")
            return False
        
        try:
            # Create VideoCapture
            cap = cv2.VideoCapture(camera.rtsp_url)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize latency
            
            if cap.isOpened():
                self.captures[camera_id] = cap
                camera.is_connected = True
                camera.error_count = 0
                logger.info(f"Connected to camera: {camera.name}")
                return True
            else:
                logger.error(f"Failed to open camera stream: {camera.name}")
                camera.error_count += 1
                return False
                
        except Exception as e:
            logger.error(f"Camera connection error: {e}")
            camera.error_count += 1
            return False
    
    def disconnect(self, camera_id: str):
        """Disconnect from camera"""
        if camera_id in self.captures:
            self.captures[camera_id].release()
            del self.captures[camera_id]
        
        camera = self.cameras.get(camera_id)
        if camera:
            camera.is_connected = False
            logger.info(f"Disconnected from camera: {camera.name}")
    
    def get_frame(self, camera_id: str) -> Optional[np.ndarray]:
        """Get current frame from camera"""
        # First check buffer
        with self._lock:
            if camera_id in self._frame_buffers:
                return self._frame_buffers[camera_id].copy()
        
        # Direct capture if no buffer
        cap = self.captures.get(camera_id)
        if not cap:
            return None
        
        try:
            ret, frame = cap.read()
            if ret:
                camera = self.cameras.get(camera_id)
                if camera:
                    camera.last_frame_time = time.time()
                return frame
            return None
        except Exception as e:
            logger.error(f"Frame capture error: {e}")
            return None
    
    def get_snapshot_base64(self, camera_id: str, quality: int = 85) -> Optional[str]:
        """Get snapshot as base64 encoded JPEG"""
        frame = self.get_frame(camera_id)
        if frame is None:
            return None
        
        try:
            # Encode as JPEG
            encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
            _, buffer = cv2.imencode('.jpg', frame, encode_param)
            
            # Convert to base64
            return base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            logger.error(f"Snapshot encoding error: {e}")
            return None
    
    def start_capture(self, camera_id: str, frame_callback=None):
        """Start continuous frame capture in background thread"""
        if camera_id in self._capture_threads:
            logger.warning(f"Capture already running for: {camera_id}")
            return
        
        camera = self.cameras.get(camera_id)
        if not camera:
            return
        
        if not camera.is_connected:
            if not self.connect(camera_id):
                return
        
        def capture_loop():
            cap = self.captures.get(camera_id)
            frame_count = 0
            start_time = time.time()
            
            while self._running and camera_id in self.cameras:
                try:
                    ret, frame = cap.read()
                    if ret:
                        frame_count += 1
                        
                        # Update buffer
                        with self._lock:
                            self._frame_buffers[camera_id] = frame
                        
                        # Calculate FPS
                        elapsed = time.time() - start_time
                        if elapsed >= 1.0:
                            camera.fps = frame_count / elapsed
                            frame_count = 0
                            start_time = time.time()
                        
                        # Callback
                        if frame_callback:
                            frame_callback(camera_id, frame)
                        
                        camera.last_frame_time = time.time()
                    else:
                        # Reconnect on failure
                        time.sleep(1)
                        self.connect(camera_id)
                        cap = self.captures.get(camera_id)
                        
                except Exception as e:
                    logger.error(f"Capture loop error: {e}")
                    time.sleep(1)
            
            logger.info(f"Capture loop ended for: {camera_id}")
        
        self._running = True
        thread = threading.Thread(target=capture_loop, daemon=True)
        thread.start()
        self._capture_threads[camera_id] = thread
        logger.info(f"Started capture for: {camera.name}")
    
    def stop_capture(self, camera_id: str):
        """Stop background capture"""
        if camera_id in self._capture_threads:
            del self._capture_threads[camera_id]
        
        if camera_id in self._frame_buffers:
            with self._lock:
                del self._frame_buffers[camera_id]
        
        self.disconnect(camera_id)
    
    def stop_all(self):
        """Stop all captures and disconnect"""
        self._running = False
        for camera_id in list(self.cameras.keys()):
            self.stop_capture(camera_id)
        logger.info("All cameras stopped")
    
    def get_status(self, camera_id: str) -> Dict[str, Any]:
        """Get camera status"""
        camera = self.cameras.get(camera_id)
        if not camera:
            return {"error": "Camera not found"}
        
        return {
            "id": camera.id,
            "name": camera.name,
            "location": camera.location,
            "is_active": camera.is_active,
            "is_connected": camera.is_connected,
            "fps": round(camera.fps, 1),
            "last_frame": camera.last_frame_time,
            "error_count": camera.error_count,
            "detection_types": camera.detection_types
        }


# Create a test/dummy frame for testing without cameras
def create_test_frame(width: int = 640, height: int = 480) -> np.ndarray:
    """Create a test frame for development"""
    if not CV2_AVAILABLE:
        return np.zeros((height, width, 3), dtype=np.uint8)
    
    frame = np.zeros((height, width, 3), dtype=np.uint8)
    
    # Add some visual elements
    cv2.rectangle(frame, (50, 50), (200, 200), (100, 100, 100), -1)
    cv2.putText(frame, "TEST FRAME", (220, 100), 
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
    cv2.putText(frame, f"Time: {time.strftime('%H:%M:%S')}", (220, 140),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    
    return frame


# Singleton camera manager
camera_manager = CameraService()
