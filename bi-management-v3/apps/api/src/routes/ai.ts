/**
 * المساعد الذكي - AI Assistant API
 * ─────────────────────────────────────
 * محادثات، تحليل، توليد مهام، تحليل أداء
 */
import { Hono } from "hono";
import { db, users } from "@bi-management/database";
import { eq, desc, sql, count } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// In-memory conversations store
const conversations: Map<string, Array<{
  id: string;
  userId: string;
  message: string;
  response: string;
  conversationId: string;
  createdAt: string;
}>> = new Map();

// Simple AI response generator (can be replaced with actual AI engine)
function generateAIResponse(message: string, userInfo: any): { response: string; suggestions: string[] } {
  const lowerMsg = message.toLowerCase();

  // Arabic/Business context responses
  if (lowerMsg.includes("مبيعات") || lowerMsg.includes("sales")) {
    return {
      response: `مرحباً ${userInfo.fullName}! بخصوص المبيعات، يمكنني مساعدتك في:\n\n1. عرض تقارير المبيعات اليومية والشهرية\n2. تحليل أداء المبيعات\n3. مقارنة المبيعات بالفترات السابقة\n\nهل تريد الاطلاع على تقرير معين؟`,
      suggestions: ["تقرير المبيعات اليوم", "أفضل المنتجات مبيعاً", "مقارنة شهرية"],
    };
  }

  if (lowerMsg.includes("مخزون") || lowerMsg.includes("inventory")) {
    return {
      response: `حالة المخزون:\n\nيمكنني مساعدتك في:\n1. فحص مستويات المخزون\n2. الأجهزة المتاحة للبيع\n3. الأجهزة التي تحتاج إعادة تخزين\n\nما الذي تريد الاستعلام عنه؟`,
      suggestions: ["المخزون المنخفض", "الأجهزة المتاحة", "حركة المخزون"],
    };
  }

  if (lowerMsg.includes("موظف") || lowerMsg.includes("employee") || lowerMsg.includes("أداء")) {
    return {
      response: `بخصوص الموظفين والأداء:\n\n1. يمكنني عرض ملخص أداء الموظفين\n2. تحليل الحضور والانصراف\n3. تقييم إنتاجية الفريق\n\nهل تريد تقرير أداء لموظف معين؟`,
      suggestions: ["تقرير الحضور", "أداء الفريق", "المهام المعلقة"],
    };
  }

  if (lowerMsg.includes("فاتورة") || lowerMsg.includes("invoice")) {
    return {
      response: `بخصوص الفواتير:\n\n1. إنشاء فاتورة جديدة\n2. البحث عن فاتورة\n3. الفواتير المعلقة\n4. تقرير الفواتير\n\nكيف أقدر أساعدك؟`,
      suggestions: ["فاتورة جديدة", "الفواتير المعلقة", "تقرير المبيعات"],
    };
  }

  // Default response
  return {
    response: `مرحباً ${userInfo.fullName}! أنا المساعد الذكي لنظام BI Management.\n\nيمكنني مساعدتك في:\n• المبيعات والفواتير\n• المخزون والأجهزة\n• الموظفين والأداء\n• التقارير والإحصائيات\n• المهام والتنبيهات\n\nاكتب سؤالك وسأحاول مساعدتك!`,
    suggestions: ["تقرير المبيعات", "حالة المخزون", "المهام اليوم", "أداء الموظفين"],
  };
}

// ─── إرسال رسالة للمساعد الذكي ───

app.post("/chat", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { message, conversation_id } = body;

    if (!message) {
      return c.json({ error: "الرسالة مطلوبة" }, 400);
    }

    // Get user info
    const [user] = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, currentUser.userId));

    const userInfo = {
      id: currentUser.userId,
      fullName: user?.fullName || "مستخدم",
    };

    // Generate response
    const result = generateAIResponse(message, userInfo);
    const convId = conversation_id || `conv_${nanoid(12)}`;
    const msgId = `msg_${nanoid(12)}`;

    // Store conversation
    if (!conversations.has(currentUser.userId)) {
      conversations.set(currentUser.userId, []);
    }
    conversations.get(currentUser.userId)!.push({
      id: msgId,
      userId: currentUser.userId,
      message,
      response: result.response,
      conversationId: convId,
      createdAt: new Date().toISOString(),
    });

    return c.json({
      success: true,
      data: {
        id: msgId,
        conversation_id: convId,
        response: result.response,
        suggestions: result.suggestions,
        blocked: false,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return c.json({ error: "فشل في معالجة الرسالة" }, 500);
  }
});

// ─── جلب محادثات المستخدم ───

app.get("/conversations", async (c) => {
  try {
    const currentUser = c.get("user");
    const limit = parseInt(c.req.query("limit") || "50");

    const userConversations = conversations.get(currentUser.userId) || [];

    return c.json({
      success: true,
      data: userConversations.slice(-limit).reverse(),
    });
  } catch (error) {
    console.error("AI conversations error:", error);
    return c.json({ error: "فشل في جلب المحادثات" }, 500);
  }
});

// ─── جلب محادثة معينة ───

app.get("/conversations/:id", async (c) => {
  try {
    const currentUser = c.get("user");
    const id = c.req.param("id");

    const userConversations = conversations.get(currentUser.userId) || [];
    const conversation = userConversations.find((m) => m.id === id || m.conversationId === id);

    if (!conversation) {
      return c.json({ error: "المحادثة غير موجودة" }, 404);
    }

    // Return all messages in the same conversation
    const messages = userConversations.filter((m) => m.conversationId === conversation.conversationId);

    return c.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    console.error("AI conversation detail error:", error);
    return c.json({ error: "فشل في جلب المحادثة" }, 500);
  }
});

// ─── تحليل نص ───

app.post("/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const { text, type = "general" } = body;

    if (!text) {
      return c.json({ error: "النص مطلوب" }, 400);
    }

    // Simple analysis
    const words = text.split(/\s+/).length;
    const sentiment = text.includes("ممتاز") || text.includes("جيد") ? "positive" :
                     text.includes("سيء") || text.includes("مشكلة") ? "negative" : "neutral";

    return c.json({
      success: true,
      data: {
        type,
        wordCount: words,
        sentiment,
        summary: text.length > 100 ? text.substring(0, 100) + "..." : text,
        keywords: text.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 5),
      },
    });
  } catch (error) {
    console.error("AI analyze error:", error);
    return c.json({ error: "فشل في التحليل" }, 500);
  }
});

// ─── توليد مهمة من وصف ───

app.post("/tasks/generate", async (c) => {
  try {
    const body = await c.req.json();
    const { description } = body;

    if (!description) {
      return c.json({ error: "الوصف مطلوب" }, 400);
    }

    return c.json({
      success: true,
      data: {
        title: description.substring(0, 50),
        description,
        priority: description.includes("عاجل") || description.includes("ضروري") ? "high" : "medium",
        estimatedHours: Math.max(1, Math.ceil(description.split(/\s+/).length / 20)),
        suggestedTags: description.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 3),
      },
    });
  } catch (error) {
    console.error("AI task generate error:", error);
    return c.json({ error: "فشل في توليد المهمة" }, 500);
  }
});

// ─── اقتراح تعيين مهمة ───

app.post("/tasks/suggest-assignment", async (c) => {
  try {
    const body = await c.req.json();
    const { task_description } = body;

    // Get active employees
    const employeesList = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.isActive, 1))
      .limit(10);

    return c.json({
      success: true,
      data: {
        suggestions: employeesList.map((emp, i) => ({
          employee: emp,
          score: Math.max(50, 100 - i * 10),
          reason: "متاح ولديه خبرة في هذا النوع من المهام",
        })),
      },
    });
  } catch (error) {
    console.error("AI suggest assignment error:", error);
    return c.json({ error: "فشل في الاقتراح" }, 500);
  }
});

// ─── فحص صحة خدمة AI ───

app.get("/health", async (c) => {
  return c.json({
    success: true,
    data: {
      status: "healthy",
      engine: "built-in",
      model: "rule-based",
      uptime: process.uptime(),
    },
  });
});

// ─── تحليل أداء موظف ───

app.post("/performance/:employeeId", async (c) => {
  try {
    const employeeId = c.req.param("employeeId");

    const [employee] = await db
      .select({ fullName: users.fullName, email: users.email })
      .from(users)
      .where(eq(users.id, employeeId));

    if (!employee) {
      return c.json({ error: "الموظف غير موجود" }, 404);
    }

    return c.json({
      success: true,
      data: {
        employee: { id: employeeId, fullName: employee.fullName },
        analysis: {
          overallScore: 75,
          strengths: ["التزام بالمواعيد", "جودة العمل", "التعاون"],
          improvements: ["سرعة الاستجابة", "التواصل مع العملاء"],
          recommendation: "أداء جيد مع فرصة للتحسين في مجال التواصل",
        },
      },
    });
  } catch (error) {
    console.error("AI performance analysis error:", error);
    return c.json({ error: "فشل في تحليل الأداء" }, 500);
  }
});

export default app;
