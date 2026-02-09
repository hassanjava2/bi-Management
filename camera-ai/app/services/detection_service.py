"""
BI Management - Detection Service
خدمة الكشف والتحليل
"""

import asyncio
import logging
import time
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import base64

logger = logging.getLogger(__name__)

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

from app.models.yolo_detector import get_detector
from app.models.activity_analyzer import ActivityAnalyzer
from app.config import settings


class DetectionService:
    """
    Main detection service that coordinates all analysis
    """
    
    def __init__(self):
        self.detector = get_detector()
        self.analyzers: Dict[str, ActivityAnalyzer] = {}  # Per-camera analyzers
        self.detection_history: List[Dict] = []
        self.alert_cooldowns: Dict[str, float] = {}  # Prevent alert spam
        self._running = False
    
    def get_analyzer(self, camera_id: str) -> ActivityAnalyzer:
        """Get or create analyzer for camera"""
        if camera_id not in self.analyzers:
            self.analyzers[camera_id] = ActivityAnalyzer({
                "idle_threshold": settings.IDLE_THRESHOLD_SECONDS,
                "movement_threshold": 50,
                "clutter_threshold": 5
            })
        return self.analyzers[camera_id]
    
    async def analyze_frame(self, camera_id: str, frame: np.ndarray,
                           detection_types: List[str] = None) -> Dict[str, Any]:
        """
        Analyze a single frame
        
        Args:
            camera_id: Camera identifier
            frame: BGR frame as numpy array
            detection_types: Types of detection to run
            
        Returns:
            Analysis results
        """
        if detection_types is None:
            detection_types = ["idle", "mess"]
        
        # Run object detection
        detections = self.detector.detect(frame)
        
        # Run activity analysis
        analyzer = self.get_analyzer(camera_id)
        analysis = analyzer.analyze(detections, frame, detection_types)
        
        # Add camera info
        analysis["camera_id"] = camera_id
        
        # Process alerts
        if analysis.get("alerts"):
            analysis["alerts"] = await self._process_alerts(camera_id, analysis["alerts"])
        
        # Save to history
        self._save_detection(camera_id, analysis)
        
        return analysis
    
    async def _process_alerts(self, camera_id: str, 
                             alerts: List[Dict]) -> List[Dict]:
        """Process and filter alerts"""
        processed = []
        current_time = time.time()
        
        for alert in alerts:
            alert_key = f"{camera_id}_{alert['type']}_{alert.get('data', {}).get('track_id', 'general')}"
            
            # Check cooldown
            last_alert = self.alert_cooldowns.get(alert_key, 0)
            if current_time - last_alert < settings.ALERT_COOLDOWN:
                continue  # Skip - too soon
            
            # Update cooldown
            self.alert_cooldowns[alert_key] = current_time
            
            # Mark for processing
            alert["should_create_task"] = alert["severity"] in ["medium", "high", "critical"]
            processed.append(alert)
        
        return processed
    
    def _save_detection(self, camera_id: str, analysis: Dict):
        """Save detection to history"""
        record = {
            "camera_id": camera_id,
            "timestamp": datetime.now().isoformat(),
            "person_count": analysis.get("person_count", 0),
            "alerts_count": len(analysis.get("alerts", [])),
            "has_idle": bool(analysis.get("idle")),
            "has_mess": bool(analysis.get("mess"))
        }
        
        self.detection_history.append(record)
        
        # Keep only last 1000 records
        if len(self.detection_history) > 1000:
            self.detection_history = self.detection_history[-1000:]
    
    def save_snapshot(self, camera_id: str, frame: np.ndarray, 
                     detection_type: str = "general") -> Optional[str]:
        """
        Save frame snapshot to disk
        
        Returns:
            Saved file path or None
        """
        if not CV2_AVAILABLE:
            return None
            
        try:
            # Create filename
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{camera_id}_{detection_type}_{timestamp}.jpg"
            filepath = os.path.join(settings.SNAPSHOTS_DIR, filename)
            
            # Ensure directory exists
            os.makedirs(settings.SNAPSHOTS_DIR, exist_ok=True)
            
            # Save image
            cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, settings.SNAPSHOT_QUALITY])
            
            logger.info(f"Snapshot saved: {filepath}")
            return filepath
            
        except Exception as e:
            logger.error(f"Failed to save snapshot: {e}")
            return None
    
    def frame_to_base64(self, frame: np.ndarray) -> str:
        """Convert frame to base64 string"""
        if not CV2_AVAILABLE:
            return ""
            
        _, buffer = cv2.imencode('.jpg', frame, 
                                 [cv2.IMWRITE_JPEG_QUALITY, settings.SNAPSHOT_QUALITY])
        return base64.b64encode(buffer).decode('utf-8')
    
    def get_history(self, camera_id: str = None, 
                   limit: int = 100) -> List[Dict]:
        """Get detection history"""
        history = self.detection_history
        
        if camera_id:
            history = [h for h in history if h["camera_id"] == camera_id]
        
        return history[-limit:]
    
    def get_statistics(self, camera_id: str = None) -> Dict[str, Any]:
        """Get detection statistics"""
        history = self.get_history(camera_id, limit=1000)
        
        if not history:
            return {
                "total_detections": 0,
                "idle_detections": 0,
                "mess_detections": 0,
                "avg_person_count": 0
            }
        
        return {
            "total_detections": len(history),
            "idle_detections": sum(1 for h in history if h.get("has_idle")),
            "mess_detections": sum(1 for h in history if h.get("has_mess")),
            "avg_person_count": sum(h.get("person_count", 0) for h in history) / len(history),
            "total_alerts": sum(h.get("alerts_count", 0) for h in history)
        }
    
    async def start_continuous_analysis(self, camera_id: str, 
                                        camera_service,
                                        on_alert=None):
        """
        Start continuous frame analysis for a camera
        
        Args:
            camera_id: Camera to analyze
            camera_service: CameraService instance
            on_alert: Callback function for alerts
        """
        self._running = True
        frame_count = 0
        
        logger.info(f"Starting continuous analysis for camera: {camera_id}")
        
        camera = camera_service.get_camera(camera_id)
        if not camera:
            logger.error(f"Camera not found: {camera_id}")
            return
        
        while self._running:
            try:
                frame = camera_service.get_frame(camera_id)
                
                if frame is None:
                    await asyncio.sleep(1)
                    continue
                
                frame_count += 1
                
                # Skip frames for performance
                if frame_count % settings.FRAME_SKIP != 0:
                    await asyncio.sleep(0.1)
                    continue
                
                # Analyze
                results = await self.analyze_frame(
                    camera_id, 
                    frame, 
                    camera.detection_types
                )
                
                # Handle alerts
                if results.get("alerts") and on_alert:
                    for alert in results["alerts"]:
                        if alert.get("should_create_task"):
                            # Save snapshot for alert
                            snapshot_path = self.save_snapshot(
                                camera_id, 
                                frame, 
                                alert["type"]
                            )
                            alert["snapshot_path"] = snapshot_path
                            alert["snapshot_base64"] = self.frame_to_base64(frame)
                            
                            await on_alert(camera_id, alert)
                
                await asyncio.sleep(0.1)
                
            except Exception as e:
                logger.error(f"Analysis error: {e}")
                await asyncio.sleep(1)
        
        logger.info(f"Stopped analysis for camera: {camera_id}")
    
    def stop_analysis(self):
        """Stop all continuous analysis"""
        self._running = False


# Singleton
detection_service = DetectionService()
