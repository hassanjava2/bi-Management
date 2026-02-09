"""
BI Management AI Engine - LLM Integration
تكامل مع Ollama للنماذج اللغوية
"""

import httpx
from typing import Dict, List, Optional, AsyncGenerator
import json
from loguru import logger

from ..config import get_settings

settings = get_settings()


class OllamaLLM:
    """
    Ollama LLM Integration
    للاتصال بنماذج Ollama المحلية
    """
    
    def __init__(self):
        self.base_url = settings.OLLAMA_HOST
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT
        self._client = None
    
    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout)
            )
        return self._client
    
    async def check_connection(self) -> bool:
        """التحقق من اتصال Ollama"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection error: {e}")
            return False
    
    async def list_models(self) -> List[str]:
        """قائمة النماذج المتوفرة"""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [m["name"] for m in data.get("models", [])]
            return []
        except Exception as e:
            logger.error(f"Error listing models: {e}")
            return []
    
    async def generate(
        self, 
        prompt: str, 
        system_prompt: str = None,
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stop: List[str] = None
    ) -> str:
        """
        توليد نص من النموذج
        
        Args:
            prompt: النص المدخل
            system_prompt: تعليمات النظام
            temperature: درجة الإبداعية (0-1)
            max_tokens: الحد الأقصى للكلمات
            stop: كلمات التوقف
        
        Returns:
            النص المولد
        """
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            if stop:
                payload["options"]["stop"] = stop
            
            response = await self.client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "")
            else:
                logger.error(f"Ollama error: {response.status_code} - {response.text}")
                return ""
                
        except httpx.TimeoutException:
            logger.error("Ollama timeout")
            return "عذراً، استغرق الطلب وقتاً طويلاً. يرجى المحاولة مرة أخرى."
        except Exception as e:
            logger.error(f"Generate error: {e}")
            return ""
    
    async def generate_stream(
        self, 
        prompt: str, 
        system_prompt: str = None
    ) -> AsyncGenerator[str, None]:
        """توليد نص بشكل متدفق (streaming)"""
        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": True,
            }
            
            if system_prompt:
                payload["system"] = system_prompt
            
            async with self.client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error(f"Stream error: {e}")
            yield "حدث خطأ أثناء المعالجة"
    
    async def chat(
        self, 
        messages: List[Dict], 
        temperature: float = 0.7
    ) -> str:
        """
        محادثة مع النموذج
        
        Args:
            messages: [{"role": "user/assistant/system", "content": "..."}]
            temperature: درجة الإبداعية
        
        Returns:
            رد النموذج
        """
        try:
            payload = {
                "model": self.model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                }
            }
            
            response = await self.client.post(
                f"{self.base_url}/api/chat",
                json=payload
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")
            else:
                logger.error(f"Chat error: {response.status_code}")
                return ""
                
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return ""
    
    async def close(self):
        """إغلاق الاتصال"""
        if self._client:
            await self._client.aclose()
            self._client = None


# Fallback للعمل بدون Ollama
class FallbackLLM:
    """
    نموذج بديل بسيط عندما لا يكون Ollama متوفراً
    يستخدم قواعد بسيطة للرد
    """
    
    def __init__(self):
        self.responses = {
            "greeting": [
                "مرحباً! كيف يمكنني مساعدتك اليوم؟",
                "أهلاً وسهلاً! أنا مساعدك الذكي.",
                "مرحبا! أنا هنا لمساعدتك."
            ],
            "task": [
                "يمكنني مساعدتك في إنشاء مهمة جديدة. ما تفاصيل المهمة؟",
                "حدد لي تفاصيل المهمة وسأقوم بإنشائها."
            ],
            "attendance": [
                "يمكنك تسجيل حضورك من لوحة التحكم.",
                "لتسجيل الحضور، اذهب إلى قسم الحضور والانصراف."
            ],
            "help": [
                "أنا مساعدك الذكي. يمكنني مساعدتك في:\n- إنشاء المهام\n- الإجابة عن الأسئلة\n- تتبع الحضور\n- حل المشاكل",
            ],
            "default": [
                "أفهم. هل يمكنك توضيح أكثر؟",
                "شكراً لسؤالك. كيف يمكنني المساعدة بشكل أفضل؟"
            ]
        }
    
    async def generate(self, prompt: str, **kwargs) -> str:
        import random
        
        prompt_lower = prompt.lower()
        
        # تحليل بسيط للنية
        if any(w in prompt_lower for w in ["مرحبا", "السلام", "صباح", "مساء", "hello"]):
            return random.choice(self.responses["greeting"])
        elif any(w in prompt_lower for w in ["مهمة", "task", "عمل"]):
            return random.choice(self.responses["task"])
        elif any(w in prompt_lower for w in ["حضور", "انصراف", "attendance"]):
            return random.choice(self.responses["attendance"])
        elif any(w in prompt_lower for w in ["مساعدة", "help", "ساعدني"]):
            return random.choice(self.responses["help"])
        else:
            return random.choice(self.responses["default"])
    
    async def chat(self, messages: List[Dict], **kwargs) -> str:
        if messages:
            last_message = messages[-1].get("content", "")
            return await self.generate(last_message)
        return "كيف يمكنني مساعدتك؟"


# Singleton
_llm_instance = None

async def get_llm() -> OllamaLLM:
    """الحصول على instance من LLM"""
    global _llm_instance
    if _llm_instance is None:
        _llm_instance = OllamaLLM()
        
        # التحقق من الاتصال
        if not await _llm_instance.check_connection():
            logger.warning("Ollama not available, using fallback")
            _llm_instance = FallbackLLM()
    
    return _llm_instance
