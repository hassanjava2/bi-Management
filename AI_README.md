# نظام الذكاء الاصطناعي المحلي - BI Distor

نظام ذكاء اصطناعي محلي مبني من الصفر باستخدام PyTorch، مصمم للتحدث مع الموظفين وإدارة المهام.

## المميزات

- ✅ **شبكة عصبية Transformer** مبنية من الصفر
- ✅ **معالج نصوص عربي** (Tokenizer) مخصص مع دعم BPE
- ✅ **نظام تدريب كامل** مع حفظ التقدم
- ✅ **API باستخدام FastAPI** للتكامل
- ✅ **واجهة ويب عصرية** للمحادثة وإدارة المهام
- ✅ **قاعدة بيانات SQLite** لإدارة المهام والموظفين
- ✅ **يعمل محلياً بالكامل** - لا يحتاج إنترنت

## المتطلبات

- Python 3.8+
- PyTorch 2.0+
- GPU مع CUDA (اختياري لكن موصى به)

## التثبيت

```bash
# تثبيت المتطلبات
pip install -r requirements.txt

# للتثبيت مع دعم CUDA (إذا لديك GPU NVIDIA)
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

## الاستخدام

### 1. تدريب النموذج

```bash
# تدريب كامل (موصى به)
python train.py --mode full

# تدريب سريع للاختبار
python train.py --mode train --model-size small --epochs 5

# تدريب متقدم
python train.py --mode train --model-size medium --epochs 20 --batch-size 16
```

### خيارات التدريب

| الخيار | الوصف | القيمة الافتراضية |
|--------|-------|------------------|
| `--mode` | وضع التشغيل: train, chat, full | full |
| `--model-size` | حجم النموذج: small, medium, large | small |
| `--epochs` | عدد حقب التدريب | 10 |
| `--batch-size` | حجم الدفعة | 8 |
| `--vocab-size` | حجم المفردات | 10000 |
| `--learning-rate` | معدل التعلم | 0.0001 |

### 2. تشغيل الخادم

```bash
python run_server.py
```

سيعمل الخادم على:
- **API**: http://localhost:8000
- **التوثيق**: http://localhost:8000/docs

### 3. فتح واجهة الويب

افتح الملف `ai_web/index.html` في المتصفح للمحادثة.
افتح الملف `ai_web/tasks.html` لإدارة المهام.

## هيكل المشروع

```
bi-distor/
├── ai_core/              # نواة الذكاء الاصطناعي
│   ├── config.py         # إعدادات النموذج
│   ├── tokenizer.py      # معالج النصوص العربي
│   ├── model.py          # نموذج Transformer
│   └── trainer.py        # نظام التدريب
├── ai_data/              # بيانات النظام
│   ├── conversations/    # بيانات التدريب
│   ├── vocab/            # المفردات
│   └── models/           # النماذج المدربة
├── api/                  # خادم API
│   └── main.py           # FastAPI server
├── ai_web/               # واجهة الويب
│   ├── index.html        # صفحة المحادثة
│   └── tasks.html        # صفحة إدارة المهام
├── database/             # قاعدة البيانات
│   └── db.py             # إدارة SQLite
├── train.py              # سكريبت التدريب
├── run_server.py         # تشغيل الخادم
└── requirements.txt      # المتطلبات
```

## إضافة بيانات تدريب

أضف ملفات JSON في مجلد `ai_data/conversations/` بالتنسيق التالي:

```json
{
  "conversations": [
    {
      "user": "سؤال المستخدم",
      "assistant": "رد المساعد"
    }
  ]
}
```

## API Endpoints

### المحادثة

```http
POST /api/chat
Content-Type: application/json

{
  "message": "السلام عليكم",
  "temperature": 0.8,
  "max_length": 150
}
```

### المهام

```http
# إنشاء مهمة
POST /api/tasks

# الحصول على المهام
GET /api/tasks

# تحديث حالة مهمة
PUT /api/tasks/{id}/status?status=completed

# حذف مهمة
DELETE /api/tasks/{id}
```

## حجم النموذج

| الحجم | المعاملات | الذاكرة | مناسب لـ |
|-------|----------|---------|---------|
| small | ~3M | 500MB | اختبار سريع |
| medium | ~25M | 2GB | استخدام عام |
| large | ~85M | 4GB | GPU قوي |

## نصائح

1. **للحصول على نتائج أفضل**: أضف المزيد من بيانات التدريب
2. **للتدريب أسرع**: استخدم GPU
3. **للتعديل**: يمكنك تعديل الإعدادات في `ai_core/config.py`
4. **للتخصيص**: أضف محادثات خاصة بشركتك

## استكشاف الأخطاء

### النموذج لا يعمل
```bash
# تأكد من وجود النموذج
ls ai_data/models/

# أعد التدريب
python train.py --mode train
```

### CUDA غير متاح
```bash
# التحقق من PyTorch
python -c "import torch; print(torch.cuda.is_available())"

# تثبيت نسخة CUDA
pip install torch --index-url https://download.pytorch.org/whl/cu118
```

### خطأ في الاتصال
- تأكد من تشغيل الخادم: `python run_server.py`
- تحقق من المنفذ 8000

## الترخيص

هذا المشروع مفتوح المصدر للاستخدام الداخلي.

---
صنع بـ ❤️ لـ BI Distor
