"""
BI Management AI Engine - Chat Routes
مسارات المحادثة
"""

from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from loguru import logger

from ..services.chat_service import get_chat_service
from ..utils.helpers import generate_id

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    """طلب محادثة"""
    user_id: str = Field(..., description="معرف المستخدم")
    message: str = Field(..., min_length=1, max_length=2000, description="الرسالة")
    conversation_id: Optional[str] = Field(None, description="معرف المحادثة للاستمرار")


class UserInfo(BaseModel):
    """معلومات المستخدم"""
    id: str
    full_name: str = "موظف"
    department_name: str = "غير محدد"
    position_name: str = "موظف"
    security_level: int = Field(1, ge=1, le=5)


class ChatResponse(BaseModel):
    """رد المحادثة"""
    response: str
    conversation_id: str
    suggestions: List[str]
    blocked: bool = False
    reason: Optional[str] = None


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    x_user_info: str = Header(None, description="JSON encoded user info")
):
    """
    إرسال رسالة للمساعد الذكي
    
    - **user_id**: معرف المستخدم
    - **message**: الرسالة
    - **conversation_id**: معرف محادثة سابقة (اختياري)
    """
    try:
        # Parse user info from header or use defaults
        import json
        if x_user_info:
            try:
                user_info = json.loads(x_user_info)
            except:
                user_info = {
                    "id": request.user_id,
                    "full_name": "موظف",
                    "security_level": 1
                }
        else:
            user_info = {
                "id": request.user_id,
                "full_name": "موظف",
                "security_level": 1
            }
        
        chat_service = await get_chat_service()
        result = await chat_service.chat(
            user_id=request.user_id,
            message=request.message,
            user_info=user_info,
            conversation_id=request.conversation_id
        )
        
        return ChatResponse(**result)
        
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{conversation_id}")
async def get_conversation(conversation_id: str):
    """
    جلب محادثة سابقة
    """
    chat_service = await get_chat_service()
    conversation = chat_service.get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    return conversation


@router.post("/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: str,
    user_id: str
):
    """
    أرشفة المحادثة في سجل الموظف
    """
    chat_service = await get_chat_service()
    result = chat_service.archive_conversation(conversation_id, user_id)
    
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result.get("error"))
    
    return result
