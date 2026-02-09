# -*- coding: utf-8 -*-
"""
سكريبت التدريب الرئيسي
Main Training Script
استخدم هذا الملف لتدريب النموذج على بياناتك
"""

import os
import sys
import argparse
import torch

# إضافة المسار للمكتبة
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from ai_core.config import ModelConfig
from ai_core.tokenizer import ArabicTokenizer
from ai_core.model import TransformerModel
from ai_core.trainer import Trainer, ConversationDataset, ChatBot


def train_tokenizer(data_dir: str, vocab_size: int = 10000, output_dir: str = "ai_data/vocab"):
    """
    تدريب المعالج على البيانات
    """
    print("\n" + "="*50)
    print("🔤 تدريب معالج النصوص العربي")
    print("="*50)
    
    # جمع جميع النصوص من ملفات المحادثات
    import json
    from pathlib import Path
    
    all_texts = []
    data_path = Path(data_dir)
    
    for json_file in data_path.glob("*.json"):
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if "conversations" in data:
                for conv in data["conversations"]:
                    if "user" in conv:
                        all_texts.append(conv["user"])
                    if "assistant" in conv:
                        all_texts.append(conv["assistant"])
    
    print(f"📚 عدد النصوص: {len(all_texts)}")
    
    # إنشاء وتدريب المعالج
    tokenizer = ArabicTokenizer(vocab_size=vocab_size)
    tokenizer.train(all_texts, verbose=True)
    
    # حفظ المعالج
    os.makedirs(output_dir, exist_ok=True)
    tokenizer.save(output_dir)
    
    return tokenizer


def train_model(
    tokenizer: ArabicTokenizer,
    data_dir: str,
    model_size: str = "small",
    epochs: int = 10,
    batch_size: int = 8,
    learning_rate: float = 1e-4,
    output_dir: str = "ai_data/models"
):
    """
    تدريب نموذج المحادثة
    """
    print("\n" + "="*50)
    print("🧠 تدريب نموذج الذكاء الاصطناعي")
    print("="*50)
    
    # إنشاء الإعدادات
    if model_size == "small":
        config = ModelConfig.small()
    elif model_size == "medium":
        config = ModelConfig.medium()
    elif model_size == "large":
        config = ModelConfig.large()
    else:
        config = ModelConfig.small()
    
    # تحديث الإعدادات
    config.vocab_size = len(tokenizer)
    config.epochs = epochs
    config.batch_size = batch_size
    config.learning_rate = learning_rate
    config.model_dir = output_dir
    
    print(f"\n📊 إعدادات النموذج:")
    print(f"   الحجم: {model_size}")
    print(f"   المفردات: {config.vocab_size}")
    print(f"   الطبقات: {config.n_layers}")
    print(f"   Attention Heads: {config.n_heads}")
    print(f"   d_model: {config.d_model}")
    
    # إنشاء النموذج
    model = TransformerModel(config)
    print(f"\n🔢 عدد المعاملات: {model.count_parameters():,}")
    
    # إنشاء مجموعة البيانات
    dataset = ConversationDataset(
        data_dir=data_dir,
        tokenizer=tokenizer,
        max_length=config.max_seq_length
    )
    
    if len(dataset) == 0:
        print("❌ لا توجد بيانات للتدريب!")
        return None, None
    
    # إنشاء المدرب
    trainer = Trainer(
        model=model,
        tokenizer=tokenizer,
        config=config,
        output_dir=output_dir
    )
    
    # بدء التدريب
    history = trainer.train(
        train_dataset=dataset,
        epochs=epochs,
        batch_size=batch_size,
        save_every=2
    )
    
    # حفظ الإعدادات
    config.save(os.path.join(output_dir, "config.json"))
    
    return model, trainer


def interactive_chat(model_path: str, tokenizer_path: str):
    """
    وضع المحادثة التفاعلية
    """
    print("\n" + "="*50)
    print("💬 وضع المحادثة التفاعلية")
    print("="*50)
    print("اكتب 'خروج' أو 'exit' للخروج")
    print("اكتب 'مسح' لمسح سجل المحادثة")
    print("="*50 + "\n")
    
    # تحميل المعالج
    tokenizer = ArabicTokenizer.load(tokenizer_path)
    
    # تحميل النموذج
    model = TransformerModel.load(model_path)
    
    # إنشاء روبوت المحادثة
    chatbot = ChatBot(model, tokenizer)
    
    while True:
        try:
            user_input = input("\n👤 أنت: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in ['خروج', 'exit', 'quit', 'q']:
                print("\n👋 مع السلامة!")
                break
            
            if user_input.lower() in ['مسح', 'clear', 'reset']:
                chatbot.reset()
                print("🗑️ تم مسح سجل المحادثة")
                continue
            
            # الحصول على الرد
            response = chatbot.chat(
                user_input,
                max_length=100,
                temperature=0.8
            )
            
            print(f"\n🤖 المساعد: {response}")
            
        except KeyboardInterrupt:
            print("\n\n👋 مع السلامة!")
            break
        except Exception as e:
            print(f"\n❌ خطأ: {e}")


def main():
    parser = argparse.ArgumentParser(description="نظام الذكاء الاصطناعي المحلي")
    
    parser.add_argument(
        "--mode",
        type=str,
        choices=["train", "chat", "full"],
        default="full",
        help="وضع التشغيل: train (تدريب), chat (محادثة), full (كامل)"
    )
    
    parser.add_argument(
        "--data-dir",
        type=str,
        default="ai_data/conversations",
        help="مسار بيانات التدريب"
    )
    
    parser.add_argument(
        "--model-dir",
        type=str,
        default="ai_data/models",
        help="مسار حفظ النموذج"
    )
    
    parser.add_argument(
        "--vocab-dir",
        type=str,
        default="ai_data/vocab",
        help="مسار حفظ المفردات"
    )
    
    parser.add_argument(
        "--model-size",
        type=str,
        choices=["small", "medium", "large"],
        default="small",
        help="حجم النموذج"
    )
    
    parser.add_argument(
        "--epochs",
        type=int,
        default=10,
        help="عدد حقب التدريب"
    )
    
    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
        help="حجم الدفعة"
    )
    
    parser.add_argument(
        "--vocab-size",
        type=int,
        default=10000,
        help="حجم المفردات"
    )
    
    parser.add_argument(
        "--learning-rate",
        type=float,
        default=1e-4,
        help="معدل التعلم"
    )
    
    args = parser.parse_args()
    
    print("\n" + "="*60)
    print("🤖 نظام الذكاء الاصطناعي المحلي - BI Distor")
    print("="*60)
    
    # التحقق من CUDA
    if torch.cuda.is_available():
        print(f"✅ GPU متاح: {torch.cuda.get_device_name(0)}")
    else:
        print("⚠️ GPU غير متاح، سيتم استخدام CPU")
    
    if args.mode in ["train", "full"]:
        # تدريب المعالج
        tokenizer = train_tokenizer(
            data_dir=args.data_dir,
            vocab_size=args.vocab_size,
            output_dir=args.vocab_dir
        )
        
        # تدريب النموذج
        model, trainer = train_model(
            tokenizer=tokenizer,
            data_dir=args.data_dir,
            model_size=args.model_size,
            epochs=args.epochs,
            batch_size=args.batch_size,
            learning_rate=args.learning_rate,
            output_dir=args.model_dir
        )
        
        if model is None:
            print("❌ فشل التدريب!")
            return
    
    if args.mode in ["chat", "full"]:
        model_path = os.path.join(args.model_dir, "best_model.pt")
        
        if not os.path.exists(model_path):
            model_path = os.path.join(args.model_dir, "final_model.pt")
        
        if os.path.exists(model_path):
            interactive_chat(model_path, args.vocab_dir)
        else:
            print("❌ لم يتم العثور على نموذج مدرب!")
            print(f"   المسار المتوقع: {model_path}")


if __name__ == "__main__":
    main()
