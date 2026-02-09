"""
BI Management - YOLO Object Detector
كاشف الكائنات باستخدام YOLO
"""

import os
import logging
from typing import List, Dict, Any, Optional
import numpy as np

logger = logging.getLogger(__name__)

# Try to import ultralytics, fallback to mock if not available
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("YOLO not available - using mock detector")


class YOLODetector:
    """
    YOLO-based object detector for camera analysis
    """
    
    # COCO classes we care about
    PERSON_CLASS = 0
    RELEVANT_CLASSES = {
        0: "person",
        24: "backpack",
        25: "umbrella", 
        26: "handbag",
        27: "tie",
        28: "suitcase",
        39: "bottle",
        41: "cup",
        56: "chair",
        57: "couch",
        58: "potted plant",
        60: "dining table",
        62: "tv",
        63: "laptop",
        64: "mouse",
        65: "remote",
        66: "keyboard",
        67: "cell phone",
        73: "book",
        74: "clock",
        75: "vase",
        76: "scissors",
    }
    
    def __init__(self, model_path: str = "yolov8n.pt", confidence: float = 0.5):
        self.model_path = model_path
        self.confidence = confidence
        self.model = None
        self._load_model()
    
    def _load_model(self):
        """Load YOLO model"""
        if not YOLO_AVAILABLE:
            logger.warning("Running without YOLO - detections will be simulated")
            return
            
        try:
            # Check if model exists locally
            if os.path.exists(self.model_path):
                self.model = YOLO(self.model_path)
            else:
                # Download model
                logger.info(f"Downloading YOLO model: {self.model_path}")
                self.model = YOLO(self.model_path)
            logger.info("YOLO model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            self.model = None
    
    def detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """
        Run object detection on a frame
        
        Args:
            frame: BGR image as numpy array
            
        Returns:
            List of detections with boxes, classes, and confidence
        """
        if self.model is None:
            return self._mock_detect(frame)
        
        try:
            results = self.model(frame, conf=self.confidence, verbose=False)
            detections = []
            
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    
                    detections.append({
                        "class_id": cls_id,
                        "class_name": self.RELEVANT_CLASSES.get(cls_id, f"class_{cls_id}"),
                        "confidence": conf,
                        "bbox": {
                            "x1": int(x1),
                            "y1": int(y1),
                            "x2": int(x2),
                            "y2": int(y2),
                            "width": int(x2 - x1),
                            "height": int(y2 - y1),
                            "center_x": int((x1 + x2) / 2),
                            "center_y": int((y1 + y2) / 2)
                        }
                    })
            
            return detections
            
        except Exception as e:
            logger.error(f"Detection error: {e}")
            return []
    
    def detect_persons(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect only persons in frame"""
        detections = self.detect(frame)
        return [d for d in detections if d["class_id"] == self.PERSON_CLASS]
    
    def detect_objects(self, frame: np.ndarray, class_ids: List[int] = None) -> List[Dict[str, Any]]:
        """Detect specific objects"""
        detections = self.detect(frame)
        if class_ids:
            return [d for d in detections if d["class_id"] in class_ids]
        return [d for d in detections if d["class_id"] != self.PERSON_CLASS]
    
    def count_persons(self, frame: np.ndarray) -> int:
        """Count number of persons in frame"""
        return len(self.detect_persons(frame))
    
    def _mock_detect(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Mock detection when YOLO is not available"""
        # Return empty or simulated detections for testing
        import random
        
        if random.random() < 0.3:  # 30% chance of detecting something
            h, w = frame.shape[:2] if len(frame.shape) >= 2 else (480, 640)
            return [{
                "class_id": 0,
                "class_name": "person",
                "confidence": 0.85,
                "bbox": {
                    "x1": int(w * 0.3),
                    "y1": int(h * 0.2),
                    "x2": int(w * 0.5),
                    "y2": int(h * 0.8),
                    "width": int(w * 0.2),
                    "height": int(h * 0.6),
                    "center_x": int(w * 0.4),
                    "center_y": int(h * 0.5)
                }
            }]
        return []


# Singleton instance
_detector = None

def get_detector() -> YOLODetector:
    global _detector
    if _detector is None:
        from app.config import settings
        model_path = os.path.join(settings.MODELS_DIR, settings.YOLO_MODEL)
        _detector = YOLODetector(model_path, settings.YOLO_CONFIDENCE)
    return _detector
