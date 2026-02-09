"""
BI Management AI Engine - Embeddings
للبحث الدلالي والـ Vector Search
"""

from typing import List, Optional
import numpy as np
from loguru import logger

# Lazy loading for sentence-transformers
_model = None


def get_embedding_model():
    """تحميل نموذج الـ Embeddings"""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            # نموذج متعدد اللغات يدعم العربية
            _model = SentenceTransformer('paraphrase-multilingual-MiniLM-L12-v2')
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            _model = None
    return _model


class EmbeddingService:
    """
    خدمة الـ Embeddings للبحث الدلالي
    """
    
    def __init__(self):
        self.model = None
        self._vectors_cache = {}
    
    def _ensure_model(self):
        """التأكد من تحميل النموذج"""
        if self.model is None:
            self.model = get_embedding_model()
    
    def encode(self, text: str) -> Optional[List[float]]:
        """
        تحويل النص إلى vector
        
        Args:
            text: النص المراد تحويله
        
        Returns:
            Vector representation
        """
        self._ensure_model()
        
        if self.model is None:
            return None
        
        try:
            # Check cache
            cache_key = hash(text)
            if cache_key in self._vectors_cache:
                return self._vectors_cache[cache_key]
            
            embedding = self.model.encode(text, convert_to_numpy=True)
            vector = embedding.tolist()
            
            # Cache (limited size)
            if len(self._vectors_cache) < 1000:
                self._vectors_cache[cache_key] = vector
            
            return vector
            
        except Exception as e:
            logger.error(f"Encoding error: {e}")
            return None
    
    def encode_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        تحويل مجموعة نصوص إلى vectors
        """
        self._ensure_model()
        
        if self.model is None:
            return [None] * len(texts)
        
        try:
            embeddings = self.model.encode(texts, convert_to_numpy=True)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            logger.error(f"Batch encoding error: {e}")
            return [None] * len(texts)
    
    def similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        حساب التشابه بين vectorين (Cosine Similarity)
        """
        try:
            a = np.array(vec1)
            b = np.array(vec2)
            return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
        except Exception as e:
            logger.error(f"Similarity error: {e}")
            return 0.0
    
    def find_similar(
        self, 
        query: str, 
        documents: List[dict],
        text_field: str = "text",
        top_k: int = 5,
        threshold: float = 0.5
    ) -> List[dict]:
        """
        البحث عن المستندات المشابهة
        
        Args:
            query: نص البحث
            documents: قائمة المستندات [{text_field: "...", ...}]
            text_field: اسم الحقل النصي
            top_k: عدد النتائج
            threshold: الحد الأدنى للتشابه
        
        Returns:
            المستندات المشابهة مع درجة التشابه
        """
        query_vec = self.encode(query)
        if query_vec is None:
            return []
        
        results = []
        
        for doc in documents:
            text = doc.get(text_field, "")
            if not text:
                continue
            
            doc_vec = self.encode(text)
            if doc_vec is None:
                continue
            
            score = self.similarity(query_vec, doc_vec)
            
            if score >= threshold:
                results.append({
                    **doc,
                    "_similarity_score": score
                })
        
        # ترتيب حسب التشابه
        results.sort(key=lambda x: x["_similarity_score"], reverse=True)
        
        return results[:top_k]
    
    def semantic_search(
        self,
        query: str,
        corpus: List[str],
        top_k: int = 5
    ) -> List[tuple]:
        """
        بحث دلالي بسيط
        
        Returns:
            [(index, text, score), ...]
        """
        query_vec = self.encode(query)
        if query_vec is None:
            return []
        
        results = []
        
        for i, text in enumerate(corpus):
            doc_vec = self.encode(text)
            if doc_vec:
                score = self.similarity(query_vec, doc_vec)
                results.append((i, text, score))
        
        results.sort(key=lambda x: x[2], reverse=True)
        return results[:top_k]


# Singleton
_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
