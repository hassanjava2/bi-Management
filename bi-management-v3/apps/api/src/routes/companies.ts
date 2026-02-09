/**
 * نظام الشركات - Companies API
 * ────────────────────────────────
 * تصنيف رئيسي متعدد الشركات
 */
import { Hono } from "hono";
import { db } from "@bi-management/database";
import { sql, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

const app = new Hono();

// ─── قائمة الشركات ───

app.get("/", async (c) => {
  try {
    const companies = await db.execute(
      sql`SELECT * FROM companies ORDER BY name`
    );
    return c.json({ success: true, data: companies.rows || [] });
  } catch (error: any) {
    // If table doesn't exist, return empty
    if (error.message?.includes("does not exist")) {
      return c.json({ success: true, data: [] });
    }
    console.error("Companies list error:", error);
    return c.json({ error: "فشل في جلب الشركات" }, 500);
  }
});

// ─── شركة بالتفصيل ───

app.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await db.execute(
      sql`SELECT * FROM companies WHERE id = ${id}`
    );
    const company = result.rows?.[0];
    if (!company) {
      return c.json({ error: "الشركة غير موجودة" }, 404);
    }
    return c.json({ success: true, data: company });
  } catch (error) {
    console.error("Company detail error:", error);
    return c.json({ error: "فشل في جلب بيانات الشركة" }, 500);
  }
});

// ─── إضافة شركة ───

app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const { code, name, name_ar } = body;

    if (!name) {
      return c.json({ error: "اسم الشركة مطلوب" }, 400);
    }

    const id = `comp_${nanoid(12)}`;
    await db.execute(
      sql`INSERT INTO companies (id, code, name, name_ar) VALUES (${id}, ${code || null}, ${name}, ${name_ar || null})`
    );

    const result = await db.execute(
      sql`SELECT * FROM companies WHERE id = ${id}`
    );

    return c.json({ success: true, data: result.rows?.[0] }, 201);
  } catch (error: any) {
    if (error.message?.includes("does not exist")) {
      // Auto-create companies table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          code TEXT UNIQUE,
          name TEXT NOT NULL,
          name_ar TEXT,
          is_active INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      return c.json({ error: "الجدول تم إنشاؤه، أعد المحاولة" }, 503);
    }
    console.error("Create company error:", error);
    return c.json({ error: "فشل في إنشاء الشركة" }, 500);
  }
});

// ─── تحديث شركة ───

app.put("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { code, name, name_ar } = body;

    await db.execute(
      sql`UPDATE companies SET code = ${code}, name = ${name}, name_ar = ${name_ar}, updated_at = NOW() WHERE id = ${id}`
    );

    const result = await db.execute(
      sql`SELECT * FROM companies WHERE id = ${id}`
    );

    return c.json({ success: true, data: result.rows?.[0] });
  } catch (error) {
    console.error("Update company error:", error);
    return c.json({ error: "فشل في تحديث الشركة" }, 500);
  }
});

// ─── حذف شركة ───

app.delete("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    await db.execute(sql`DELETE FROM companies WHERE id = ${id}`);
    return c.json({ success: true, message: "تم حذف الشركة" });
  } catch (error) {
    console.error("Delete company error:", error);
    return c.json({ error: "فشل في حذف الشركة" }, 500);
  }
});

export default app;
