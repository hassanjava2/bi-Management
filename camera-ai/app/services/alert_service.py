"""
BI Management - Alert Service
خدمة التنبيهات والإشعارات
"""

import logging
import asyncio
from typing import Dict, Any, List, Callable, Optional
from datetime import datetime
from collections import defaultdict

from app.services.task_creator import task_creator
from app.config import settings, SEVERITY_LEVELS

logger = logging.getLogger(__name__)


class AlertService:
    """
    Manages alerts from camera detections
    """
    
    def __init__(self):
        self.alert_history: List[Dict] = []
        self.alert_handlers: Dict[str, List[Callable]] = defaultdict(list)
        self.pending_alerts: asyncio.Queue = asyncio.Queue()
        self._processing = False
    
    def register_handler(self, alert_type: str, handler: Callable):
        """
        Register a handler for specific alert type
        
        Args:
            alert_type: Type of alert (mess, idle, products, etc.)
            handler: Async function to handle the alert
        """
        self.alert_handlers[alert_type].append(handler)
        logger.info(f"Registered handler for alert type: {alert_type}")
    
    async def process_alert(self, camera_id: str, alert: Dict[str, Any]):
        """
        Process a single alert
        
        Args:
            camera_id: Source camera
            alert: Alert data
        """
        alert_type = alert.get("type")
        severity = alert.get("severity", "low")
        
        logger.info(f"Processing alert: {alert_type} (severity: {severity}) from camera: {camera_id}")
        
        # Save to history
        self._save_alert(camera_id, alert)
        
        # Create task if needed
        if alert.get("should_create_task", False):
            await self._create_task_for_alert(camera_id, alert)
        
        # Run registered handlers
        handlers = self.alert_handlers.get(alert_type, []) + self.alert_handlers.get("*", [])
        for handler in handlers:
            try:
                await handler(camera_id, alert)
            except Exception as e:
                logger.error(f"Alert handler error: {e}")
        
        # Notify managers if high severity
        if SEVERITY_LEVELS.get(severity, {}).get("notify_manager", False):
            await self._notify_managers(camera_id, alert)
    
    async def _create_task_for_alert(self, camera_id: str, alert: Dict[str, Any]):
        """Create appropriate task based on alert type"""
        alert_type = alert.get("type")
        
        try:
            if alert_type == "mess":
                await task_creator.create_cleaning_task(
                    camera_id,
                    alert.get("data", {}),
                    alert.get("data", {}).get("location")
                )
            
            elif alert_type == "idle":
                await task_creator.create_idle_warning(
                    camera_id,
                    alert.get("data", {})
                )
            
            elif alert_type == "products":
                await task_creator.create_organization_task(
                    camera_id,
                    alert.get("data", {}),
                    alert.get("data", {}).get("location")
                )
            
            else:
                logger.warning(f"Unknown alert type for task creation: {alert_type}")
                
        except Exception as e:
            logger.error(f"Failed to create task for alert: {e}")
    
    async def _notify_managers(self, camera_id: str, alert: Dict[str, Any]):
        """Send notifications to managers"""
        notification = {
            "title": f"تنبيه من الكاميرات - {alert.get('type')}",
            "body": alert.get("message", "تنبيه جديد من نظام المراقبة"),
            "type": "urgent" if alert.get("severity") == "critical" else "alert",
            "data": {
                "camera_id": camera_id,
                "alert_type": alert.get("type"),
                "severity": alert.get("severity"),
                "timestamp": datetime.now().isoformat()
            }
        }
        
        # TODO: Get actual manager IDs from backend
        # For now, notify a placeholder
        # await task_creator.send_notification("manager_id", notification)
        logger.info(f"Would notify managers: {notification['title']}")
    
    def _save_alert(self, camera_id: str, alert: Dict[str, Any]):
        """Save alert to history"""
        record = {
            "camera_id": camera_id,
            "type": alert.get("type"),
            "severity": alert.get("severity"),
            "message": alert.get("message"),
            "timestamp": datetime.now().isoformat(),
            "task_created": alert.get("should_create_task", False)
        }
        
        self.alert_history.append(record)
        
        # Keep only last 500 alerts
        if len(self.alert_history) > 500:
            self.alert_history = self.alert_history[-500:]
    
    async def queue_alert(self, camera_id: str, alert: Dict[str, Any]):
        """Add alert to processing queue"""
        await self.pending_alerts.put((camera_id, alert))
    
    async def start_processing(self):
        """Start processing queued alerts"""
        self._processing = True
        logger.info("Alert processing started")
        
        while self._processing:
            try:
                # Wait for alert with timeout
                try:
                    camera_id, alert = await asyncio.wait_for(
                        self.pending_alerts.get(),
                        timeout=1.0
                    )
                    await self.process_alert(camera_id, alert)
                except asyncio.TimeoutError:
                    continue
                    
            except Exception as e:
                logger.error(f"Alert processing error: {e}")
                await asyncio.sleep(1)
    
    def stop_processing(self):
        """Stop alert processing"""
        self._processing = False
        logger.info("Alert processing stopped")
    
    def get_history(self, camera_id: str = None, 
                   alert_type: str = None,
                   limit: int = 50) -> List[Dict]:
        """Get alert history with filters"""
        history = self.alert_history
        
        if camera_id:
            history = [h for h in history if h.get("camera_id") == camera_id]
        
        if alert_type:
            history = [h for h in history if h.get("type") == alert_type]
        
        return history[-limit:]
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get alert statistics"""
        if not self.alert_history:
            return {
                "total_alerts": 0,
                "by_type": {},
                "by_severity": {}
            }
        
        by_type = defaultdict(int)
        by_severity = defaultdict(int)
        
        for alert in self.alert_history:
            by_type[alert.get("type", "unknown")] += 1
            by_severity[alert.get("severity", "unknown")] += 1
        
        return {
            "total_alerts": len(self.alert_history),
            "by_type": dict(by_type),
            "by_severity": dict(by_severity),
            "tasks_created": sum(1 for a in self.alert_history if a.get("task_created"))
        }


# Singleton
alert_service = AlertService()
