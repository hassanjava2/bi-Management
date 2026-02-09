import { Hono } from "hono";
import { db } from "@bi-management/database";

const app = new Hono();

app.get("/", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.get("/db", async (c) => {
  try {
    await db.query.roles.findFirst({ columns: { id: true } });
    return c.json({
      status: "ok",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Database health check failed:", e);
    return c.json(
      {
        status: "degraded",
        db: "disconnected",
        error: "Database health check failed",
        timestamp: new Date().toISOString(),
      },
      503
    );
  }
});

export default app;
