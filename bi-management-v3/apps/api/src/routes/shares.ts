/**
 * نظام الأسهم والشراكة - Shares API
 * ──────────────────────────────────────
 * إدارة المساهمين، المعاملات، الأرباح
 */
import { Hono } from "hono";
import {
  db,
  shareholders,
  shareTransactions,
  dividends,
  dividendDetails,
  users,
  settings,
} from "@bi-management/database";
import { eq, desc, sql, and, count, sum } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// ─── إعدادات نظام الأسهم ───

app.get("/config", async (c) => {
  try {
    const [row] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "share_system_type"));

    const shareSystemType = row?.value || "fixed_value_variable_count";

    return c.json({
      success: true,
      data: {
        share_system_type: shareSystemType,
        modes: ["fixed_value_variable_count", "fixed_count_variable_value"],
      },
    });
  } catch (error) {
    return c.json({
      success: true,
      data: {
        share_system_type: "fixed_value_variable_count",
        modes: ["fixed_value_variable_count", "fixed_count_variable_value"],
      },
    });
  }
});

// ─── ملخص الأسهم ───

app.get("/summary", async (c) => {
  try {
    const shareholdersList = await db
      .select()
      .from(shareholders)
      .orderBy(shareholders.name);

    const totalShares = shareholdersList.reduce(
      (sum, sh) => sum + (sh.sharePercentage || 0),
      0
    );

    const totalValue = shareholdersList.reduce(
      (sum, sh) => sum + (sh.shareValue || 0),
      0
    );

    return c.json({
      success: true,
      data: {
        shareholders: shareholdersList,
        total_shares: totalShares,
        total_value: totalValue,
        count: shareholdersList.length,
      },
    });
  } catch (error) {
    console.error("Shares summary error:", error);
    return c.json({
      success: true,
      data: { shareholders: [], total_shares: 0, total_value: 0, count: 0 },
    });
  }
});

// ─── قائمة المساهمين ───

app.get("/shareholders", async (c) => {
  try {
    const list = await db
      .select()
      .from(shareholders)
      .where(eq(shareholders.isActive, 1))
      .orderBy(desc(shareholders.sharePercentage));

    return c.json({ success: true, data: list });
  } catch (error) {
    console.error("Shareholders list error:", error);
    return c.json({ error: "فشل في جلب المساهمين" }, 500);
  }
});

// ─── مساهم بالتفصيل ───

app.get("/shareholders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const [shareholder] = await db
      .select()
      .from(shareholders)
      .where(eq(shareholders.id, id));

    if (!shareholder) {
      return c.json({ error: "المساهم غير موجود" }, 404);
    }

    // معاملات المساهم
    const transactions = await db
      .select()
      .from(shareTransactions)
      .where(
        sql`${shareTransactions.fromShareholderId} = ${id} OR ${shareTransactions.toShareholderId} = ${id}`
      )
      .orderBy(desc(shareTransactions.createdAt));

    // أرباح المساهم
    const dividendsList = await db
      .select({
        id: dividendDetails.id,
        dividendId: dividendDetails.dividendId,
        amount: dividendDetails.amount,
        sharePercentage: dividendDetails.sharePercentage,
        paid: dividendDetails.paid,
        paidAt: dividendDetails.paidAt,
        periodStart: dividends.periodStart,
        periodEnd: dividends.periodEnd,
      })
      .from(dividendDetails)
      .innerJoin(dividends, eq(dividendDetails.dividendId, dividends.id))
      .where(eq(dividendDetails.shareholderId, id))
      .orderBy(desc(dividends.periodEnd));

    return c.json({
      success: true,
      data: {
        ...shareholder,
        transactions,
        dividends: dividendsList,
      },
    });
  } catch (error) {
    console.error("Shareholder detail error:", error);
    return c.json({ error: "فشل في جلب بيانات المساهم" }, 500);
  }
});

// ─── إضافة مساهم ───

app.post("/shareholders", async (c) => {
  try {
    const body = await c.req.json();
    const { name, phone, email, address, sharePercentage, shareValue, joinDate, bankAccount, bankName } = body;

    if (!name || sharePercentage == null) {
      return c.json({ error: "الاسم ونسبة المساهمة مطلوبان" }, 400);
    }

    const id = `sh_${nanoid(12)}`;
    const code = `SH-${String(Date.now()).slice(-6)}`;

    await db.insert(shareholders).values({
      id,
      code,
      name,
      phone,
      email,
      address,
      sharePercentage,
      shareValue: shareValue || 0,
      joinDate: joinDate || new Date().toISOString().split("T")[0],
      bankAccount,
      bankName,
    });

    const [created] = await db.select().from(shareholders).where(eq(shareholders.id, id));

    return c.json({ success: true, data: created }, 201);
  } catch (error) {
    console.error("Create shareholder error:", error);
    return c.json({ error: "فشل في إضافة المساهم" }, 500);
  }
});

// ─── تحديث مساهم ───

app.put("/shareholders/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();

    await db
      .update(shareholders)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(shareholders.id, id));

    const [updated] = await db.select().from(shareholders).where(eq(shareholders.id, id));

    return c.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update shareholder error:", error);
    return c.json({ error: "فشل في تحديث المساهم" }, 500);
  }
});

// ─── قائمة التوزيعات ───

app.get("/dividends", async (c) => {
  try {
    const list = await db
      .select()
      .from(dividends)
      .orderBy(desc(dividends.createdAt));

    return c.json({ success: true, data: list });
  } catch (error) {
    console.error("Dividends list error:", error);
    return c.json({ error: "فشل في جلب التوزيعات" }, 500);
  }
});

// ─── إنشاء توزيع أرباح ───

app.post("/dividends", async (c) => {
  try {
    const currentUser = c.get("user");
    const body = await c.req.json();
    const { periodStart, periodEnd, totalProfit, retainedAmount } = body;

    if (!periodStart || !periodEnd || !totalProfit) {
      return c.json({ error: "بيانات التوزيع غير مكتملة" }, 400);
    }

    const distributed = totalProfit - (retainedAmount || 0);
    const dividendId = `div_${nanoid(12)}`;

    await db.insert(dividends).values({
      id: dividendId,
      periodStart,
      periodEnd,
      totalProfit,
      distributedAmount: distributed,
      retainedAmount: retainedAmount || 0,
      status: "draft",
      createdBy: currentUser.userId,
    });

    // Create details for each shareholder
    const activeShareholders = await db
      .select()
      .from(shareholders)
      .where(eq(shareholders.isActive, 1));

    for (const sh of activeShareholders) {
      const amount = (distributed * sh.sharePercentage) / 100;
      await db.insert(dividendDetails).values({
        id: `dd_${nanoid(12)}`,
        dividendId,
        shareholderId: sh.id,
        sharePercentage: sh.sharePercentage,
        amount,
      });
    }

    return c.json({
      success: true,
      message: "تم إنشاء توزيع الأرباح",
      data: { id: dividendId },
    }, 201);
  } catch (error) {
    console.error("Create dividend error:", error);
    return c.json({ error: "فشل في إنشاء التوزيع" }, 500);
  }
});

export default app;
