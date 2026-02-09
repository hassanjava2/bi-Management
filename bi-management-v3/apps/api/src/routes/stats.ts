import { Hono } from "hono";
import { count, eq, and, sum, ne } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";
import {
  db,
  products,
  categories,
  customers,
  branches,
  warehouses,
  suppliers,
  invoices,
  users,
  roles,
  vouchers,
  cashRegisters,
  bankAccounts,
  checks,
} from "@bi-management/database";

const app = new Hono();

app.get("/", authMiddleware, async (c) => {
  try {
    const [p, cat, cust, b, w, s, inv, u, r, vch, cr, ba, chk] = await Promise.all([
      db.select({ count: count() }).from(products),
      db.select({ count: count() }).from(categories),
      db.select({ count: count() }).from(customers),
      db.select({ count: count() }).from(branches),
      db.select({ count: count() }).from(warehouses),
      db.select({ count: count() }).from(suppliers),
      db.select({ count: count() }).from(invoices).where(eq(invoices.isDeleted, 0)),
      db.select({ count: count() }).from(users).where(eq(users.isDeleted, 0)),
      db.select({ count: count() }).from(roles),
      db.select({ count: count() }).from(vouchers).where(eq(vouchers.isDeleted, 0)),
      db.select({ count: count() }).from(cashRegisters).where(eq(cashRegisters.isActive, 1)),
      db.select({ count: count() }).from(bankAccounts).where(eq(bankAccounts.isActive, 1)),
      db.select({ count: count() }).from(checks).where(ne(checks.status, "cancelled")),
    ]);

    // Financial summaries
    const [salesTotal, purchaseTotal, cashBalance, bankBalance] = await Promise.all([
      db.select({ total: sum(invoices.total) }).from(invoices).where(and(eq(invoices.isDeleted, 0), eq(invoices.type, "sale"))),
      db.select({ total: sum(invoices.total) }).from(invoices).where(and(eq(invoices.isDeleted, 0), eq(invoices.type, "purchase"))),
      db.select({ total: sum(cashRegisters.balance) }).from(cashRegisters).where(eq(cashRegisters.isActive, 1)),
      db.select({ total: sum(bankAccounts.balance) }).from(bankAccounts).where(eq(bankAccounts.isActive, 1)),
    ]);

    return c.json({
      products: p[0]?.count ?? 0,
      categories: cat[0]?.count ?? 0,
      customers: cust[0]?.count ?? 0,
      branches: b[0]?.count ?? 0,
      warehouses: w[0]?.count ?? 0,
      suppliers: s[0]?.count ?? 0,
      invoices: inv[0]?.count ?? 0,
      users: u[0]?.count ?? 0,
      roles: r[0]?.count ?? 0,
      vouchers: vch[0]?.count ?? 0,
      cashRegisters: cr[0]?.count ?? 0,
      bankAccounts: ba[0]?.count ?? 0,
      checks: chk[0]?.count ?? 0,
      // Financial summaries
      totalSales: Number(salesTotal[0]?.total) || 0,
      totalPurchases: Number(purchaseTotal[0]?.total) || 0,
      totalCashBalance: Number(cashBalance[0]?.total) || 0,
      totalBankBalance: Number(bankBalance[0]?.total) || 0,
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

export default app;
