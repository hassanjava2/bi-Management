"""
BI Management - Camera AI Helpers
أدوات مساعدة
"""

import os
import uuid
import json
import base64
from datetime import datetime
from typing import Any, Dict, Optional


def generate_id() -> str:
    """Generate a unique ID"""
    return str(uuid.uuid4())[:8]


def timestamp() -> str:
    """Get current timestamp as ISO string"""
    return datetime.now().isoformat()


def safe_json_loads(text: str, default: Any = None) -> Any:
    """Safely parse JSON"""
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        return default


def safe_json_dumps(obj: Any, default: str = "{}") -> str:
    """Safely serialize to JSON"""
    try:
        return json.dumps(obj, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        return default


def ensure_dir(path: str):
    """Ensure directory exists"""
    os.makedirs(path, exist_ok=True)


def file_to_base64(filepath: str) -> Optional[str]:
    """Read file and convert to base64"""
    try:
        with open(filepath, "rb") as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception:
        return None


def base64_to_file(b64_string: str, filepath: str) -> bool:
    """Save base64 string to file"""
    try:
        data = base64.b64decode(b64_string)
        with open(filepath, "wb") as f:
            f.write(data)
        return True
    except Exception:
        return False


def format_duration(seconds: float) -> str:
    """Format duration in human readable format"""
    if seconds < 60:
        return f"{int(seconds)} ثانية"
    elif seconds < 3600:
        minutes = int(seconds // 60)
        return f"{minutes} دقيقة"
    else:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        return f"{hours} ساعة و {minutes} دقيقة"


def calculate_iou(box1: Dict, box2: Dict) -> float:
    """
    Calculate Intersection over Union between two bounding boxes
    
    Args:
        box1, box2: Dicts with x1, y1, x2, y2 keys
        
    Returns:
        IoU value between 0 and 1
    """
    x1 = max(box1["x1"], box2["x1"])
    y1 = max(box1["y1"], box2["y1"])
    x2 = min(box1["x2"], box2["x2"])
    y2 = min(box1["y2"], box2["y2"])
    
    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    
    area1 = (box1["x2"] - box1["x1"]) * (box1["y2"] - box1["y1"])
    area2 = (box2["x2"] - box2["x1"]) * (box2["y2"] - box2["y1"])
    
    union = area1 + area2 - intersection
    
    if union == 0:
        return 0
    
    return intersection / union


def box_center(box: Dict) -> tuple:
    """Get center point of bounding box"""
    return (
        (box["x1"] + box["x2"]) // 2,
        (box["y1"] + box["y2"]) // 2
    )


def box_area(box: Dict) -> int:
    """Calculate area of bounding box"""
    return (box["x2"] - box["x1"]) * (box["y2"] - box["y1"])
