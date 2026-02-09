import { describe, it, expect } from "vitest";
import app from "./health.js";

describe("Health route", () => {
  it("GET / returns 200 and status ok", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("status", "ok");
  });
});
