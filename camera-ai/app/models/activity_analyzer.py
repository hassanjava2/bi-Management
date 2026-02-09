"""
BI Management - Activity Analyzer
محلل النشاط والحركة
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple
from collections import defaultdict
from dataclasses import dataclass, field
import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PersonTrack:
    """Track a person's position over time"""
    id: str
    first_seen: float
    last_seen: float
    positions: List[Tuple[int, int]] = field(default_factory=list)
    last_movement: float = 0
    is_idle: bool = False
    idle_duration: float = 0


class IdleDetector:
    """
    Detects employees who haven't moved for extended periods
    """
    
    def __init__(self, idle_threshold: int = 300, movement_threshold: int = 50):
        """
        Args:
            idle_threshold: Seconds without movement to be considered idle
            movement_threshold: Pixels of movement to reset idle timer
        """
        self.idle_threshold = idle_threshold
        self.movement_threshold = movement_threshold
        self.tracks: Dict[str, PersonTrack] = {}
        self._next_id = 0
    
    def update(self, detections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Update tracks with new detections and check for idle persons
        
        Args:
            detections: List of person detections from YOLO
            
        Returns:
            List of idle detection results
        """
        current_time = time.time()
        idle_results = []
        
        # Match detections to existing tracks (simple nearest neighbor)
        matched_tracks = set()
        
        for det in detections:
            if det.get("class_id") != 0:  # Only persons
                continue
                
            center = (det["bbox"]["center_x"], det["bbox"]["center_y"])
            
            # Find closest existing track
            best_track = None
            best_dist = float("inf")
            
            for track_id, track in self.tracks.items():
                if track_id in matched_tracks:
                    continue
                if not track.positions:
                    continue
                    
                last_pos = track.positions[-1]
                dist = np.sqrt((center[0] - last_pos[0])**2 + (center[1] - last_pos[1])**2)
                
                if dist < best_dist and dist < 200:  # Max 200px to match
                    best_dist = dist
                    best_track = track_id
            
            if best_track:
                # Update existing track
                track = self.tracks[best_track]
                track.last_seen = current_time
                
                # Check if moved significantly
                if track.positions:
                    last_pos = track.positions[-1]
                    movement = np.sqrt(
                        (center[0] - last_pos[0])**2 + 
                        (center[1] - last_pos[1])**2
                    )
                    if movement > self.movement_threshold:
                        track.last_movement = current_time
                        track.is_idle = False
                        track.idle_duration = 0
                
                track.positions.append(center)
                if len(track.positions) > 100:
                    track.positions = track.positions[-100:]
                    
                matched_tracks.add(best_track)
                
                # Check if idle
                time_since_movement = current_time - track.last_movement
                if time_since_movement > self.idle_threshold:
                    track.is_idle = True
                    track.idle_duration = time_since_movement
                    
                    idle_results.append({
                        "detected": True,
                        "track_id": best_track,
                        "employee_area": f"zone_{hash(center) % 10}",
                        "idle_duration": int(track.idle_duration),
                        "position": center,
                        "bbox": det["bbox"],
                        "severity": self._calculate_severity(track.idle_duration)
                    })
            else:
                # Create new track
                track_id = f"person_{self._next_id}"
                self._next_id += 1
                
                self.tracks[track_id] = PersonTrack(
                    id=track_id,
                    first_seen=current_time,
                    last_seen=current_time,
                    positions=[center],
                    last_movement=current_time
                )
                matched_tracks.add(track_id)
        
        # Clean up old tracks
        stale_tracks = [
            tid for tid, track in self.tracks.items()
            if current_time - track.last_seen > 30  # Remove after 30s not seen
        ]
        for tid in stale_tracks:
            del self.tracks[tid]
        
        return idle_results
    
    def _calculate_severity(self, idle_duration: float) -> str:
        """Calculate severity based on idle duration"""
        if idle_duration > 1800:  # 30 minutes
            return "high"
        elif idle_duration > 900:  # 15 minutes
            return "medium"
        else:
            return "low"
    
    def get_all_idle(self) -> List[PersonTrack]:
        """Get all currently idle persons"""
        return [t for t in self.tracks.values() if t.is_idle]


class MessDetector:
    """
    Detects mess and clutter in the frame
    Uses object detection + heuristics
    """
    
    # Objects that indicate mess when too many
    MESS_INDICATORS = {
        24: "backpack",
        26: "handbag", 
        28: "suitcase",
        39: "bottle",
        41: "cup",
        73: "book",
    }
    
    def __init__(self, clutter_threshold: int = 5):
        """
        Args:
            clutter_threshold: Number of scattered items to trigger alert
        """
        self.clutter_threshold = clutter_threshold
        self.baseline_state: Optional[Dict] = None
    
    def set_baseline(self, detections: List[Dict[str, Any]]):
        """Set baseline state for comparison"""
        self.baseline_state = self._analyze_state(detections)
    
    def detect_mess(self, detections: List[Dict[str, Any]], 
                    frame: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Detect mess/clutter in the scene
        
        Args:
            detections: Object detections from YOLO
            frame: Optional frame for additional analysis
            
        Returns:
            Detection result
        """
        current_state = self._analyze_state(detections)
        
        # Check for clutter
        clutter_items = [
            d for d in detections 
            if d.get("class_id") in self.MESS_INDICATORS
        ]
        
        # Check floor area for scattered items
        floor_items = self._get_floor_items(detections)
        
        # Calculate mess score
        mess_score = len(clutter_items) + len(floor_items) * 2
        
        detected = mess_score >= self.clutter_threshold
        
        if detected:
            severity = "high" if mess_score > 10 else "medium" if mess_score > 5 else "low"
            
            return {
                "detected": True,
                "mess_score": mess_score,
                "clutter_count": len(clutter_items),
                "floor_items": len(floor_items),
                "severity": severity,
                "items": [
                    {"type": d.get("class_name"), "position": d.get("bbox")}
                    for d in clutter_items[:5]  # Top 5
                ]
            }
        
        return {"detected": False, "mess_score": mess_score}
    
    def _analyze_state(self, detections: List[Dict[str, Any]]) -> Dict:
        """Analyze scene state"""
        return {
            "object_count": len(detections),
            "person_count": len([d for d in detections if d.get("class_id") == 0]),
            "item_positions": [
                (d.get("bbox", {}).get("center_x"), d.get("bbox", {}).get("center_y"))
                for d in detections
            ]
        }
    
    def _get_floor_items(self, detections: List[Dict[str, Any]]) -> List[Dict]:
        """Get items that appear to be on the floor"""
        # Items in bottom third of frame, not persons
        floor_items = []
        for d in detections:
            if d.get("class_id") == 0:  # Skip persons
                continue
            bbox = d.get("bbox", {})
            # If bottom of bbox is in lower 40% of typical frame
            if bbox.get("y2", 0) > 400:  # Assuming ~720p
                floor_items.append(d)
        return floor_items


class ActivityAnalyzer:
    """
    Main activity analyzer combining all detection types
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        
        self.idle_detector = IdleDetector(
            idle_threshold=self.config.get("idle_threshold", 300),
            movement_threshold=self.config.get("movement_threshold", 50)
        )
        
        self.mess_detector = MessDetector(
            clutter_threshold=self.config.get("clutter_threshold", 5)
        )
        
        self.last_analysis: Dict[str, Any] = {}
    
    def analyze(self, detections: List[Dict[str, Any]], 
                frame: Optional[np.ndarray] = None,
                detection_types: List[str] = None) -> Dict[str, Any]:
        """
        Run full analysis on detections
        
        Args:
            detections: Object detections from YOLO
            frame: Original frame (optional)
            detection_types: List of analysis types to run
            
        Returns:
            Analysis results
        """
        if detection_types is None:
            detection_types = ["idle", "mess"]
        
        results = {
            "timestamp": time.time(),
            "total_detections": len(detections),
            "person_count": len([d for d in detections if d.get("class_id") == 0]),
            "alerts": []
        }
        
        # Idle detection
        if "idle" in detection_types:
            idle_results = self.idle_detector.update(detections)
            if idle_results:
                results["idle"] = idle_results
                for idle in idle_results:
                    results["alerts"].append({
                        "type": "idle",
                        "severity": idle["severity"],
                        "message": f"موظف خامل لمدة {idle['idle_duration'] // 60} دقيقة",
                        "data": idle
                    })
        
        # Mess detection
        if "mess" in detection_types:
            mess_result = self.mess_detector.detect_mess(detections, frame)
            if mess_result.get("detected"):
                results["mess"] = mess_result
                results["alerts"].append({
                    "type": "mess",
                    "severity": mess_result["severity"],
                    "message": f"تم اكتشاف فوضى (مستوى: {mess_result['mess_score']})",
                    "data": mess_result
                })
        
        self.last_analysis = results
        return results
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary of current state"""
        return {
            "tracked_persons": len(self.idle_detector.tracks),
            "idle_persons": len(self.idle_detector.get_all_idle()),
            "last_analysis": self.last_analysis
        }
