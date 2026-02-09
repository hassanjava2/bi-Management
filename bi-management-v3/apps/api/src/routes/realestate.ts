/**
 * API Routes - نظام إدارة العقارات والإيجارات
 */
import { Hono } from "hono";
import { db, properties, propertyUnits, leaseContracts, rentPayments, propertyMaintenance } from "@bi-management/database";
import { eq, and, or, desc, count, sum, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// العقارات
app.get("/properties", async (c) => {
  try {
    const { status, type } = c.req.query();
    const conditions = [eq(properties.isActive, true)];
    if (status) conditions.push(eq(properties.status, status));
    if (type) conditions.push(eq(properties.propertyType, type));

    const result = await db.select().from(properties)
      .where(and(...conditions))
      .orderBy(desc(properties.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching properties:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(properties).where(eq(properties.isActive, true));
    const [available] = await db.select({ count: count() }).from(properties)
      .where(and(eq(properties.isActive, true), eq(properties.status, "available")));
    const [occupied] = await db.select({ count: count() }).from(properties)
      .where(and(eq(properties.isActive, true), eq(properties.status, "occupied")));
    
    const [totalUnits] = await db.select({ count: count() }).from(propertyUnits)
      .where(eq(propertyUnits.isActive, true));
    const [vacantUnits] = await db.select({ count: count() }).from(propertyUnits)
      .where(and(eq(propertyUnits.isActive, true), eq(propertyUnits.status, "vacant")));
    
    const [activeContracts] = await db.select({ count: count() }).from(leaseContracts)
      .where(eq(leaseContracts.status, "active"));
    
    const [pendingPayments] = await db.select({ count: count() }).from(rentPayments)
      .where(eq(rentPayments.status, "pending"));
    
    const [pendingMaintenance] = await db.select({ count: count() }).from(propertyMaintenance)
      .where(or(eq(propertyMaintenance.status, "pending"), eq(propertyMaintenance.status, "scheduled")));

    return c.json({
      totalProperties: total?.count || 0,
      availableProperties: available?.count || 0,
      occupiedProperties: occupied?.count || 0,
      totalUnits: totalUnits?.count || 0,
      vacantUnits: vacantUnits?.count || 0,
      activeContracts: activeContracts?.count || 0,
      pendingPayments: pendingPayments?.count || 0,
      pendingMaintenance: pendingMaintenance?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/properties/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    if (!property) return c.json({ error: "العقار غير موجود" }, 404);

    const units = await db.select().from(propertyUnits)
      .where(and(eq(propertyUnits.propertyId, id), eq(propertyUnits.isActive, true)));
    
    const contracts = await db.select().from(leaseContracts)
      .where(eq(leaseContracts.propertyId, id))
      .orderBy(desc(leaseContracts.createdAt));

    return c.json({ ...property, units, contracts });
  } catch (error) {
    console.error("Error fetching property:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/properties", async (c) => {
  try {
    const body = await c.req.json();
    const id = `prop_${nanoid(12)}`;
    const propertyNumber = generateNumber("PROP");

    await db.insert(properties).values({
      id, propertyNumber,
      name: body.name,
      description: body.description || null,
      propertyType: body.propertyType || "commercial",
      address: body.address,
      city: body.city || null,
      region: body.region || null,
      postalCode: body.postalCode || null,
      coordinates: body.coordinates || null,
      totalArea: body.totalArea || null,
      usableArea: body.usableArea || null,
      floors: body.floors || null,
      ownershipType: body.ownershipType || "owned",
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice || null,
      currentValue: body.currentValue || null,
      status: "available",
      features: body.features || null,
      images: body.images || null,
      managedBy: body.managedBy || null,
      branchId: body.branchId || null,
      notes: body.notes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, propertyNumber }, 201);
  } catch (error) {
    console.error("Error creating property:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// الوحدات
app.post("/properties/:propertyId/units", async (c) => {
  try {
    const { propertyId } = c.req.param();
    const body = await c.req.json();
    const id = `unit_${nanoid(12)}`;

    await db.insert(propertyUnits).values({
      id, propertyId,
      unitNumber: body.unitNumber,
      name: body.name || null,
      floor: body.floor || null,
      unitType: body.unitType || "office",
      area: body.area || null,
      monthlyRent: body.monthlyRent || null,
      annualRent: body.annualRent || null,
      status: "vacant",
      features: body.features || null,
      isActive: true,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating unit:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// العقود
app.get("/contracts", async (c) => {
  try {
    const { status, propertyId } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(leaseContracts.status, status));
    if (propertyId) conditions.push(eq(leaseContracts.propertyId, propertyId));

    const result = await db.select().from(leaseContracts)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(leaseContracts.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching contracts:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/contracts", async (c) => {
  try {
    const body = await c.req.json();
    const id = `lease_${nanoid(12)}`;
    const contractNumber = generateNumber("LEASE");

    await db.insert(leaseContracts).values({
      id, contractNumber,
      propertyId: body.propertyId,
      unitId: body.unitId || null,
      tenantId: body.tenantId,
      tenantType: body.tenantType || "individual",
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      monthlyRent: body.monthlyRent,
      annualRent: body.annualRent || null,
      paymentFrequency: body.paymentFrequency || "monthly",
      securityDeposit: body.securityDeposit || null,
      depositPaid: false,
      terms: body.terms || null,
      specialConditions: body.specialConditions || null,
      status: "draft",
      autoRenew: body.autoRenew || false,
      createdBy: body.createdBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, contractNumber }, 201);
  } catch (error) {
    console.error("Error creating contract:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/contracts/:id/activate", async (c) => {
  try {
    const { id } = c.req.param();
    const { signedBy } = await c.req.json();

    const [contract] = await db.select().from(leaseContracts).where(eq(leaseContracts.id, id));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    await db.update(leaseContracts).set({
      status: "active",
      signedAt: new Date(),
      signedBy: signedBy || null,
      updatedAt: new Date(),
    }).where(eq(leaseContracts.id, id));

    // تحديث حالة الوحدة/العقار
    if (contract.unitId) {
      await db.update(propertyUnits).set({ status: "occupied", currentTenantId: contract.tenantId })
        .where(eq(propertyUnits.id, contract.unitId));
    }
    await db.update(properties).set({ status: "occupied", updatedAt: new Date() })
      .where(eq(properties.id, contract.propertyId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error activating contract:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.patch("/contracts/:id/terminate", async (c) => {
  try {
    const { id } = c.req.param();
    const { reason } = await c.req.json();

    const [contract] = await db.select().from(leaseContracts).where(eq(leaseContracts.id, id));
    if (!contract) return c.json({ error: "العقد غير موجود" }, 404);

    await db.update(leaseContracts).set({
      status: "terminated",
      terminatedAt: new Date(),
      terminationReason: reason || null,
      updatedAt: new Date(),
    }).where(eq(leaseContracts.id, id));

    // تحديث حالة الوحدة/العقار
    if (contract.unitId) {
      await db.update(propertyUnits).set({ status: "vacant", currentTenantId: null })
        .where(eq(propertyUnits.id, contract.unitId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error terminating contract:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// المدفوعات
app.get("/payments", async (c) => {
  try {
    const { status, contractId } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(rentPayments.status, status));
    if (contractId) conditions.push(eq(rentPayments.contractId, contractId));

    const result = await db.select().from(rentPayments)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(rentPayments.dueDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/payments", async (c) => {
  try {
    const body = await c.req.json();
    const id = `rpay_${nanoid(12)}`;
    const paymentNumber = generateNumber("RPAY");

    await db.insert(rentPayments).values({
      id, paymentNumber,
      contractId: body.contractId,
      periodStart: new Date(body.periodStart),
      periodEnd: new Date(body.periodEnd),
      amount: body.amount,
      lateFee: body.lateFee || "0",
      totalAmount: body.totalAmount || body.amount,
      dueDate: new Date(body.dueDate),
      status: "pending",
      notes: body.notes || null,
      createdAt: new Date(),
    });

    return c.json({ id, paymentNumber }, 201);
  } catch (error) {
    console.error("Error creating payment:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/payments/:id/pay", async (c) => {
  try {
    const { id } = c.req.param();
    const { paidAmount, paymentMethod, paymentReference } = await c.req.json();

    const [payment] = await db.select().from(rentPayments).where(eq(rentPayments.id, id));
    if (!payment) return c.json({ error: "الدفعة غير موجودة" }, 404);

    const totalPaid = Number(payment.paidAmount || 0) + Number(paidAmount);
    const status = totalPaid >= Number(payment.totalAmount) ? "paid" : "partial";

    await db.update(rentPayments).set({
      status,
      paidAmount: totalPaid.toString(),
      paidAt: new Date(),
      paymentMethod: paymentMethod || null,
      paymentReference: paymentReference || null,
    }).where(eq(rentPayments.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating payment:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الصيانة
app.get("/maintenance", async (c) => {
  try {
    const { propertyId, status } = c.req.query();
    const conditions = [];
    if (propertyId) conditions.push(eq(propertyMaintenance.propertyId, propertyId));
    if (status) conditions.push(eq(propertyMaintenance.status, status));

    const result = await db.select().from(propertyMaintenance)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(propertyMaintenance.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching maintenance:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/maintenance", async (c) => {
  try {
    const body = await c.req.json();
    const id = `pmnt_${nanoid(12)}`;
    const maintenanceNumber = generateNumber("PMNT");

    await db.insert(propertyMaintenance).values({
      id, maintenanceNumber,
      propertyId: body.propertyId,
      unitId: body.unitId || null,
      maintenanceType: body.maintenanceType || "repair",
      title: body.title,
      description: body.description || null,
      priority: body.priority || "medium",
      estimatedCost: body.estimatedCost || null,
      paidBy: body.paidBy || null,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      vendor: body.vendor || null,
      vendorContact: body.vendorContact || null,
      status: "pending",
      reportedBy: body.reportedBy || null,
      assignedTo: body.assignedTo || null,
      images: body.images || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, maintenanceNumber }, 201);
  } catch (error) {
    console.error("Error creating maintenance:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/maintenance/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { actualCost } = await c.req.json();

    await db.update(propertyMaintenance).set({
      status: "completed",
      completedDate: new Date(),
      actualCost: actualCost || null,
      updatedAt: new Date(),
    }).where(eq(propertyMaintenance.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing maintenance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;
