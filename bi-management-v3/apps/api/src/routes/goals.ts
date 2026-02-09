/**
 * نظام الأهداف والحوافز - Goals & Incentives API
 * ─────────────────────────────────────────────────
 * نقاط، لوحة متصدرين، مكافآت، شارات
 */
import { Hono } from "hono";
import { db, users } from "@bi-management/database";
import { eq, desc, sql, and, count } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// ─── تعريف النقاط والمستويات ───

const POINTS_CONFIG: Record<string, number> = {
  sale_completed: 10,
  invoice_created: 5,
  task_completed: 8,
  attendance_on_time: 3,
  customer_added: 5,
  return_processed: 4,
  maintenance_completed: 6,
  training_completed: 15,
  daily_login: 1,
  manual_bonus: 0,
  manual_deduction: 0,
};

const LEVELS = [
  { level: 1, name: "مبتدئ", minPoints: 0, badge: "🌱" },
  { level: 2, name: "نشط", minPoints: 100, badge: "⭐" },
  { level: 3, name: "متميز", minPoints: 300, badge: "🌟" },
  { level: 4, name: "خبير", minPoints: 600, badge: "💎" },
  { level: 5, name: "بطل", minPoints: 1000, badge: "🏆" },
  { level: 6, name: "أسطورة", minPoints: 2000, badge: "👑" },
];

const BADGES = [
  { id: "first_sale", name: "أول بيعة", description: "أكمل أول عملية بيع", icon: "🎯" },
  { id: "speed_demon", name: "سريع البرق", description: "أكمل 10 مهام في يوم واحد", icon: "⚡" },
  { id: "team_player", name: "لاعب فريق", description: "ساعد 5 زملاء", icon: "🤝" },
  { id: "perfect_week", name: "أسبوع مثالي", description: "حضور كامل لأسبوع", icon: "📅" },
  { id: "top_seller", name: "أفضل بائع", description: "تصدر المبيعات لشهر", icon: "🥇" },
  { id: "century", name: "المئة", description: "وصل إلى 100 نقطة", icon: "💯" },
];

const REWARDS = [
  { id: "half_day_off", name: "نصف يوم إجازة", cost: 200, description: "احصل على نصف يوم إجازة", available: true },
  { id: "gift_card_25", name: "بطاقة هدية 25$", cost: 350, description: "بطاقة هدية بقيمة 25 دولار", available: true },
  { id: "full_day_off", name: "يوم إجازة كامل", cost: 500, description: "احصل على يوم إجازة كامل", available: true },
  { id: "gift_card_50", name: "بطاقة هدية 50$", cost: 700, description: "بطاقة هدية بقيمة 50 دولار", available: true },
  { id: "bonus_salary", name: "مكافأة مالية", cost: 1500, description: "مكافأة مالية إضافية", available: true },
];

// In-memory store for points (in production, use a database table)
const userPoints: Map<string, {
  totalPoints: number;
  currentPoints: number;
  level: number;
  levelName: string;
  badge: string;
  history: Array<{ id: string; reason: string; points: number; date: string; note?: string }>;
  badges: string[];
  redemptions: Array<{ id: string; rewardId: string; cost: number; date: string; status: string }>;
}> = new Map();

function getUserPointsData(userId: string) {
  if (!userPoints.has(userId)) {
    userPoints.set(userId, {
      totalPoints: 0,
      currentPoints: 0,
      level: 1,
      levelName: "مبتدئ",
      badge: "🌱",
      history: [],
      badges: [],
      redemptions: [],
    });
  }
  return userPoints.get(userId)!;
}

function calculateLevel(totalPoints: number) {
  let currentLevel = LEVELS[0];
  for (const level of LEVELS) {
    if (totalPoints >= level.minPoints) {
      currentLevel = level;
    }
  }
  return currentLevel;
}

// ─── نقاطي ───

app.get("/my-points", async (c) => {
  try {
    const currentUser = c.get("user");
    const data = getUserPointsData(currentUser.userId);
    const level = calculateLevel(data.totalPoints);

    return c.json({
      success: true,
      data: {
        totalPoints: data.totalPoints,
        currentPoints: data.currentPoints,
        level: level.level,
        levelName: level.name,
        badge: level.badge,
        nextLevel: LEVELS[level.level] || null,
        pointsToNextLevel: LEVELS[level.level] ? LEVELS[level.level].minPoints - data.totalPoints : 0,
      },
    });
  } catch (error) {
    console.error("Goals my-points error:", error);
    return c.json({ error: "فشل في جلب النقاط" }, 500);
  }
});

// ─── سجل نقاطي ───

app.get("/my-history", async (c) => {
  try {
    const currentUser = c.get("user");
    const limit = parseInt(c.req.query("limit") || "20");
    const offset = parseInt(c.req.query("offset") || "0");
    const data = getUserPointsData(currentUser.userId);

    const history = data.history.slice(offset, offset + limit);

    return c.json({
      success: true,
      data: history,
      total: data.history.length,
    });
  } catch (error) {
    console.error("Goals my-history error:", error);
    return c.json({ error: "فشل في جلب السجل" }, 500);
  }
});

// ─── إحصائياتي ───

app.get("/my-stats", async (c) => {
  try {
    const currentUser = c.get("user");
    const period = c.req.query("period") || "month";
    const data = getUserPointsData(currentUser.userId);

    const now = new Date();
    let startDate = new Date();
    if (period === "week") startDate.setDate(now.getDate() - 7);
    else if (period === "month") startDate.setMonth(now.getMonth() - 1);
    else if (period === "year") startDate.setFullYear(now.getFullYear() - 1);

    const periodHistory = data.history.filter(h => new Date(h.date) >= startDate);
    const earned = periodHistory.filter(h => h.points > 0).reduce((s, h) => s + h.points, 0);
    const spent = periodHistory.filter(h => h.points < 0).reduce((s, h) => s + Math.abs(h.points), 0);

    return c.json({
      success: true,
      data: {
        period,
        pointsEarned: earned,
        pointsSpent: spent,
        netPoints: earned - spent,
        transactionCount: periodHistory.length,
      },
    });
  } catch (error) {
    console.error("Goals my-stats error:", error);
    return c.json({ error: "فشل في جلب الإحصائيات" }, 500);
  }
});

// ─── شاراتي ───

app.get("/my-badges", async (c) => {
  try {
    const currentUser = c.get("user");
    const data = getUserPointsData(currentUser.userId);

    const allBadges = BADGES.map(b => ({
      ...b,
      earned: data.badges.includes(b.id),
    }));

    return c.json({
      success: true,
      data: allBadges,
    });
  } catch (error) {
    console.error("Goals my-badges error:", error);
    return c.json({ error: "فشل في جلب الشارات" }, 500);
  }
});

// ─── لوحة المتصدرين ───

app.get("/leaderboard", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");

    // Get all users with points
    const leaderboard: Array<{ userId: string; fullName: string; totalPoints: number; level: number; badge: string }> = [];

    for (const [userId, data] of userPoints.entries()) {
      const level = calculateLevel(data.totalPoints);
      // Get user name
      const [user] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));
      leaderboard.push({
        userId,
        fullName: user?.fullName || "مستخدم",
        totalPoints: data.totalPoints,
        level: level.level,
        badge: level.badge,
      });
    }

    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return c.json({
      success: true,
      data: leaderboard.slice(0, limit).map((entry, index) => ({ ...entry, rank: index + 1 })),
    });
  } catch (error) {
    console.error("Goals leaderboard error:", error);
    return c.json({ error: "فشل في جلب لوحة المتصدرين" }, 500);
  }
});

// ─── المكافآت المتاحة ───

app.get("/rewards", async (c) => {
  try {
    return c.json({
      success: true,
      data: REWARDS,
    });
  } catch (error) {
    return c.json({ error: "فشل في جلب المكافآت" }, 500);
  }
});

// ─── استبدال مكافأة ───

app.post("/rewards/:id/redeem", async (c) => {
  try {
    const currentUser = c.get("user");
    const rewardId = c.req.param("id");
    const reward = REWARDS.find(r => r.id === rewardId);

    if (!reward) {
      return c.json({ error: "المكافأة غير موجودة" }, 404);
    }

    const data = getUserPointsData(currentUser.userId);

    if (data.currentPoints < reward.cost) {
      return c.json({ error: "نقاطك غير كافية" }, 400);
    }

    // Deduct points
    data.currentPoints -= reward.cost;
    data.history.push({
      id: nanoid(12),
      reason: `استبدال مكافأة: ${reward.name}`,
      points: -reward.cost,
      date: new Date().toISOString(),
    });

    data.redemptions.push({
      id: nanoid(12),
      rewardId,
      cost: reward.cost,
      date: new Date().toISOString(),
      status: "pending",
    });

    return c.json({
      success: true,
      data: { rewardId, cost: reward.cost, remainingPoints: data.currentPoints },
      message: "تم طلب المكافأة بنجاح",
    });
  } catch (error) {
    console.error("Goals redeem error:", error);
    return c.json({ error: "فشل في استبدال المكافأة" }, 500);
  }
});

// ─── المستويات ───

app.get("/levels", async (c) => {
  return c.json({ success: true, data: LEVELS });
});

// ─── تكوين النقاط ───

app.get("/config", async (c) => {
  return c.json({
    success: true,
    data: { points: POINTS_CONFIG, levels: LEVELS },
  });
});

// ─── منح نقاط (Admin/HR) ───

app.post("/award", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, points, reason, description } = body;

    if (!user_id || !points) {
      return c.json({ error: "user_id و points مطلوبان" }, 400);
    }

    const data = getUserPointsData(user_id);
    const amount = parseInt(points);
    data.totalPoints += amount;
    data.currentPoints += amount;
    data.history.unshift({
      id: nanoid(12),
      reason: reason || "manual_bonus",
      points: amount,
      date: new Date().toISOString(),
      note: description,
    });

    // Check for century badge
    if (data.totalPoints >= 100 && !data.badges.includes("century")) {
      data.badges.push("century");
    }

    return c.json({
      success: true,
      message: `تم منح ${points} نقطة`,
    });
  } catch (error) {
    console.error("Goals award error:", error);
    return c.json({ error: "فشل في منح النقاط" }, 500);
  }
});

// ─── خصم نقاط (Admin/HR) ───

app.post("/deduct", async (c) => {
  try {
    const body = await c.req.json();
    const { user_id, points, reason, note } = body;

    if (!user_id || !points) {
      return c.json({ error: "user_id و points مطلوبان" }, 400);
    }

    const data = getUserPointsData(user_id);
    const amount = parseInt(points);
    data.currentPoints = Math.max(0, data.currentPoints - amount);
    data.history.unshift({
      id: nanoid(12),
      reason: reason || "manual_deduction",
      points: -amount,
      date: new Date().toISOString(),
      note,
    });

    return c.json({
      success: true,
      message: `تم خصم ${points} نقطة`,
    });
  } catch (error) {
    console.error("Goals deduct error:", error);
    return c.json({ error: "فشل في خصم النقاط" }, 500);
  }
});

// ─── نقاط موظف (Admin/HR/Manager) ───

app.get("/user/:id", async (c) => {
  try {
    const userId = c.req.param("id");
    const data = getUserPointsData(userId);
    const level = calculateLevel(data.totalPoints);

    const [user] = await db.select({ fullName: users.fullName }).from(users).where(eq(users.id, userId));

    return c.json({
      success: true,
      data: {
        user: { id: userId, fullName: user?.fullName || "مستخدم" },
        totalPoints: data.totalPoints,
        currentPoints: data.currentPoints,
        level: level.level,
        levelName: level.name,
        badge: level.badge,
        badges: data.badges,
        recentHistory: data.history.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Goals user error:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// ─── سجل نقاط موظف (Admin/HR) ───

app.get("/user/:id/history", async (c) => {
  try {
    const userId = c.req.param("id");
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const data = getUserPointsData(userId);

    return c.json({
      success: true,
      data: data.history.slice(offset, offset + limit),
      total: data.history.length,
    });
  } catch (error) {
    console.error("Goals user history error:", error);
    return c.json({ error: "فشل في جلب السجل" }, 500);
  }
});

export default app;
