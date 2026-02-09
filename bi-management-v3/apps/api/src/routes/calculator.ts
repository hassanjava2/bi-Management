/**
 * الآلة الحاسبة - Calculator/Chat API
 * ─────────────────────────────────────────
 * محادثة علنية ومسار دوري للمندوبين
 */
import { Hono } from "hono";
import { db, users, customers } from "@bi-management/database";
import { eq, desc, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// In-memory chat messages store
const chatMessages: Array<{
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: string;
}> = [];

// In-memory route schedules
const routeSchedules: Array<{
  id: string;
  repId: string;
  repName: string;
  scheduleDate: string;
  customerId: string | null;
  customerName: string | null;
  stopOrder: number;
  notes: string | null;
  createdAt: string;
}> = [];

// ─── جلب رسائل المحادثة ───

app.get("/chat", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const messages = chatMessages.slice(-Math.min(limit, 100));

    return c.json({ success: true, data: messages });
  } catch (error) {
    console.error("Calculator chat get error:", error);
    return c.json({ error: "فشل في جلب الرسائل" }, 500);
  }
});

// ─── إرسال رسالة ───

app.post("/chat", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { message } = body;

    if (!message || !String(message).trim()) {
      return c.json({ error: "الرسالة مطلوبة" }, 400);
    }

    // Get user name
    const [user] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, currentUser.userId));

    const chatMessage = {
      id: `chat_${nanoid(12)}`,
      userId: currentUser.userId,
      userName: user?.fullName || "مستخدم",
      message: String(message).trim(),
      createdAt: new Date().toISOString(),
    };

    chatMessages.push(chatMessage);

    // Keep only last 500 messages
    if (chatMessages.length > 500) {
      chatMessages.splice(0, chatMessages.length - 500);
    }

    return c.json({ success: true, data: chatMessage }, 201);
  } catch (error) {
    console.error("Calculator chat post error:", error);
    return c.json({ error: "فشل في إرسال الرسالة" }, 500);
  }
});

// ─── جلب جداول المسارات ───

app.get("/routes", async (c) => {
  try {
    const repId = c.req.query("rep_id");
    const scheduleDate = c.req.query("schedule_date");

    let filtered = [...routeSchedules];

    if (repId) {
      filtered = filtered.filter((r) => r.repId === repId);
    }
    if (scheduleDate) {
      filtered = filtered.filter((r) => r.scheduleDate === scheduleDate);
    }

    filtered.sort((a, b) => {
      if (a.scheduleDate !== b.scheduleDate) return a.scheduleDate.localeCompare(b.scheduleDate);
      return a.stopOrder - b.stopOrder;
    });

    return c.json({ success: true, data: filtered });
  } catch (error) {
    console.error("Calculator routes get error:", error);
    return c.json({ error: "فشل في جلب المسارات" }, 500);
  }
});

// ─── إضافة مسار ───

app.post("/routes", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { rep_id, schedule_date, customer_id, stop_order, notes } = body;

    if (!rep_id || !schedule_date) {
      return c.json({ error: "rep_id و schedule_date مطلوبان" }, 400);
    }

    // Get rep name
    const [rep] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, rep_id));

    // Get customer name if provided
    let customerName = null;
    if (customer_id) {
      const [customer] = await db
        .select({ name: customers.name })
        .from(customers)
        .where(eq(customers.id, customer_id));
      customerName = customer?.name || null;
    }

    const route = {
      id: `route_${nanoid(12)}`,
      repId: rep_id,
      repName: rep?.fullName || "مندوب",
      scheduleDate: schedule_date,
      customerId: customer_id || null,
      customerName,
      stopOrder: parseInt(stop_order || "0"),
      notes: notes || null,
      createdAt: new Date().toISOString(),
    };

    routeSchedules.push(route);

    return c.json({ success: true, data: route }, 201);
  } catch (error) {
    console.error("Calculator routes post error:", error);
    return c.json({ error: "فشل في إضافة المسار" }, 500);
  }
});

// ─── حذف مسار ───

app.delete("/routes/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const index = routeSchedules.findIndex((r) => r.id === id);

    if (index === -1) {
      return c.json({ error: "المسار غير موجود" }, 404);
    }

    routeSchedules.splice(index, 1);

    return c.json({ success: true, message: "تم حذف المسار" });
  } catch (error) {
    console.error("Calculator routes delete error:", error);
    return c.json({ error: "فشل في حذف المسار" }, 500);
  }
});

export default app;
