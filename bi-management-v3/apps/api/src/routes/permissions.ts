import { Hono } from "hono";
import { db } from "@bi-management/database";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const page = Math.max(1, Number(c.req.query("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(c.req.query("limit")) || 50));
    const offset = (page - 1) * limit;

    const rows = await db.query.permissions.findMany({
      columns: {
        id: true,
        code: true,
        nameAr: true,
        module: true,
        feature: true,
        action: true,
        securityLevel: true,
      },
      limit,
      offset,
    });

    return c.json({
      data: rows,
      page,
      limit,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;
