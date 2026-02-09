/**
 * API Routes - نظام إدارة المركبات والأسطول
 */
import { Hono } from "hono";
import { db, vehicles, vehicleRequests, vehicleMaintenance, fuelRecords, drivers, trafficViolations } from "@bi-management/database";
import { eq, and, or, desc, count, sum, gte, lte } from "drizzle-orm";
import { nanoid } from "nanoid";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

const generateNumber = (prefix: string) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

// المركبات
app.get("/vehicles", async (c) => {
  try {
    const { status, type, branchId } = c.req.query();
    const conditions = [eq(vehicles.isActive, true)];
    if (status) conditions.push(eq(vehicles.status, status));
    if (type) conditions.push(eq(vehicles.vehicleType, type));
    if (branchId) conditions.push(eq(vehicles.branchId, branchId));

    const result = await db.select().from(vehicles)
      .where(and(...conditions))
      .orderBy(desc(vehicles.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.get("/stats", async (c) => {
  try {
    const [total] = await db.select({ count: count() }).from(vehicles).where(eq(vehicles.isActive, true));
    const [available] = await db.select({ count: count() }).from(vehicles)
      .where(and(eq(vehicles.isActive, true), eq(vehicles.status, "available")));
    const [inUse] = await db.select({ count: count() }).from(vehicles)
      .where(and(eq(vehicles.isActive, true), eq(vehicles.status, "in_use")));
    const [maintenance] = await db.select({ count: count() }).from(vehicles)
      .where(and(eq(vehicles.isActive, true), eq(vehicles.status, "maintenance")));
    
    const [pendingRequests] = await db.select({ count: count() }).from(vehicleRequests)
      .where(eq(vehicleRequests.status, "pending"));
    
    const [activeDrivers] = await db.select({ count: count() }).from(drivers)
      .where(eq(drivers.status, "active"));
    
    const [unpaidViolations] = await db.select({ count: count() }).from(trafficViolations)
      .where(eq(trafficViolations.isPaid, false));

    return c.json({
      totalVehicles: total?.count || 0,
      availableVehicles: available?.count || 0,
      inUseVehicles: inUse?.count || 0,
      maintenanceVehicles: maintenance?.count || 0,
      pendingRequests: pendingRequests?.count || 0,
      activeDrivers: activeDrivers?.count || 0,
      unpaidViolations: unpaidViolations?.count || 0,
    });
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.get("/vehicles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    if (!vehicle) return c.json({ error: "المركبة غير موجودة" }, 404);

    const maintenanceHistory = await db.select().from(vehicleMaintenance)
      .where(eq(vehicleMaintenance.vehicleId, id))
      .orderBy(desc(vehicleMaintenance.createdAt))
      .limit(10);
    
    const fuelHistory = await db.select().from(fuelRecords)
      .where(eq(fuelRecords.vehicleId, id))
      .orderBy(desc(fuelRecords.filledAt))
      .limit(10);

    return c.json({ ...vehicle, maintenanceHistory, fuelHistory });
  } catch (error) {
    console.error("Error fetching vehicle:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/vehicles", async (c) => {
  try {
    const body = await c.req.json();
    const id = `veh_${nanoid(12)}`;
    const vehicleNumber = generateNumber("VEH");

    await db.insert(vehicles).values({
      id, vehicleNumber,
      plateNumber: body.plateNumber,
      brand: body.brand,
      model: body.model,
      year: body.year || null,
      color: body.color || null,
      vehicleType: body.vehicleType || "sedan",
      fuelType: body.fuelType || "gasoline",
      engineNumber: body.engineNumber || null,
      chassisNumber: body.chassisNumber || null,
      capacity: body.capacity || null,
      loadCapacity: body.loadCapacity || null,
      ownershipType: body.ownershipType || "owned",
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      purchasePrice: body.purchasePrice || null,
      assignedTo: body.assignedTo || null,
      departmentId: body.departmentId || null,
      branchId: body.branchId || null,
      status: "available",
      currentMileage: body.currentMileage || 0,
      registrationExpiry: body.registrationExpiry ? new Date(body.registrationExpiry) : null,
      insuranceExpiry: body.insuranceExpiry ? new Date(body.insuranceExpiry) : null,
      inspectionExpiry: body.inspectionExpiry ? new Date(body.inspectionExpiry) : null,
      images: body.images || null,
      notes: body.notes || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, vehicleNumber }, 201);
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/vehicles/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const updates: any = { updatedAt: new Date() };
    if (body.status) updates.status = body.status;
    if (body.currentMileage) updates.currentMileage = body.currentMileage;
    if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo;

    await db.update(vehicles).set(updates).where(eq(vehicles.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in fleet:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// طلبات الاستخدام
app.get("/requests", async (c) => {
  try {
    const { status, requesterId } = c.req.query();
    const conditions = [];
    if (status) conditions.push(eq(vehicleRequests.status, status));
    if (requesterId) conditions.push(eq(vehicleRequests.requesterId, requesterId));

    const result = await db.select().from(vehicleRequests)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vehicleRequests.createdAt));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching requests:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/requests", async (c) => {
  try {
    const body = await c.req.json();
    const id = `vreq_${nanoid(12)}`;
    const requestNumber = generateNumber("VREQ");

    await db.insert(vehicleRequests).values({
      id, requestNumber,
      requesterId: body.requesterId,
      departmentId: body.departmentId || null,
      vehicleId: body.vehicleId || null,
      preferredVehicleType: body.preferredVehicleType || null,
      purpose: body.purpose,
      destination: body.destination || null,
      passengers: body.passengers || null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      status: "pending",
      driverId: body.driverId || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id, requestNumber }, 201);
  } catch (error) {
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/requests/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const { approverId, vehicleId, driverId } = await c.req.json();

    await db.update(vehicleRequests).set({
      status: "approved",
      approvedBy: approverId,
      approvedAt: new Date(),
      vehicleId: vehicleId || null,
      driverId: driverId || null,
      updatedAt: new Date(),
    }).where(eq(vehicleRequests.id, id));

    // تحديث حالة المركبة
    if (vehicleId) {
      await db.update(vehicles).set({ status: "reserved", updatedAt: new Date() })
        .where(eq(vehicles.id, vehicleId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error approving request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

app.post("/requests/:id/start", async (c) => {
  try {
    const { id } = c.req.param();
    const { startMileage } = await c.req.json();

    const [request] = await db.select().from(vehicleRequests).where(eq(vehicleRequests.id, id));
    if (!request) return c.json({ error: "الطلب غير موجود" }, 404);

    await db.update(vehicleRequests).set({
      status: "in_progress",
      actualStartDate: new Date(),
      startMileage: startMileage || null,
      updatedAt: new Date(),
    }).where(eq(vehicleRequests.id, id));

    if (request.vehicleId) {
      await db.update(vehicles).set({ status: "in_use", updatedAt: new Date() })
        .where(eq(vehicles.id, request.vehicleId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error in fleet:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/requests/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const { endMileage } = await c.req.json();

    const [request] = await db.select().from(vehicleRequests).where(eq(vehicleRequests.id, id));
    if (!request) return c.json({ error: "الطلب غير موجود" }, 404);

    await db.update(vehicleRequests).set({
      status: "completed",
      actualEndDate: new Date(),
      endMileage: endMileage || null,
      updatedAt: new Date(),
    }).where(eq(vehicleRequests.id, id));

    if (request.vehicleId) {
      await db.update(vehicles).set({
        status: "available",
        currentMileage: endMileage || undefined,
        updatedAt: new Date(),
      }).where(eq(vehicles.id, request.vehicleId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing request:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الصيانة
app.get("/maintenance", async (c) => {
  try {
    const { vehicleId, status } = c.req.query();
    const conditions = [];
    if (vehicleId) conditions.push(eq(vehicleMaintenance.vehicleId, vehicleId));
    if (status) conditions.push(eq(vehicleMaintenance.status, status));

    const result = await db.select().from(vehicleMaintenance)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vehicleMaintenance.scheduledDate));

    return c.json(result);
  } catch (error) {
    console.error("Error in fleet:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

app.post("/maintenance", async (c) => {
  try {
    const body = await c.req.json();
    const id = `vmnt_${nanoid(12)}`;
    const maintenanceNumber = generateNumber("VMNT");

    await db.insert(vehicleMaintenance).values({
      id, maintenanceNumber,
      vehicleId: body.vehicleId,
      maintenanceType: body.maintenanceType || "routine",
      description: body.description,
      items: body.items || null,
      laborCost: body.laborCost || null,
      partsCost: body.partsCost || null,
      totalCost: body.totalCost || null,
      vendor: body.vendor || null,
      mileageAtService: body.mileageAtService || null,
      nextServiceMileage: body.nextServiceMileage || null,
      nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : new Date(),
      status: "scheduled",
      createdAt: new Date(),
    });

    // تحديث حالة المركبة
    await db.update(vehicles).set({ status: "maintenance", updatedAt: new Date() })
      .where(eq(vehicles.id, body.vehicleId));

    return c.json({ id, maintenanceNumber }, 201);
  } catch (error) {
    console.error("Error creating maintenance:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/maintenance/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [maint] = await db.select().from(vehicleMaintenance).where(eq(vehicleMaintenance.id, id));
    if (!maint) return c.json({ error: "غير موجود" }, 404);

    await db.update(vehicleMaintenance).set({
      status: "completed",
      completedDate: new Date(),
      totalCost: body.totalCost || maint.totalCost,
    }).where(eq(vehicleMaintenance.id, id));

    await db.update(vehicles).set({ status: "available", updatedAt: new Date() })
      .where(eq(vehicles.id, maint.vehicleId));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error completing maintenance:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// الوقود
app.post("/fuel", async (c) => {
  try {
    const body = await c.req.json();
    const id = `fuel_${nanoid(12)}`;

    await db.insert(fuelRecords).values({
      id,
      vehicleId: body.vehicleId,
      fuelType: body.fuelType || null,
      quantity: body.quantity,
      pricePerUnit: body.pricePerUnit || null,
      totalCost: body.totalCost,
      station: body.station || null,
      location: body.location || null,
      mileage: body.mileage || null,
      filledBy: body.filledBy || null,
      filledAt: new Date(),
      notes: body.notes || null,
      receiptImage: body.receiptImage || null,
      createdAt: new Date(),
    });

    // تحديث الأميال
    if (body.mileage) {
      await db.update(vehicles).set({
        currentMileage: body.mileage,
        updatedAt: new Date(),
      }).where(eq(vehicles.id, body.vehicleId));
    }

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error in fleet:", error);
    return c.json({ error: "فشل" }, 500);
  }
});

// السائقين
app.get("/drivers", async (c) => {
  try {
    const result = await db.select().from(drivers).orderBy(desc(drivers.createdAt));
    return c.json(result);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/drivers", async (c) => {
  try {
    const body = await c.req.json();
    const id = `drv_${nanoid(12)}`;

    await db.insert(drivers).values({
      id,
      userId: body.userId,
      licenseNumber: body.licenseNumber,
      licenseType: body.licenseType || null,
      licenseExpiry: body.licenseExpiry ? new Date(body.licenseExpiry) : null,
      status: "active",
      assignedVehicleId: body.assignedVehicleId || null,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating driver:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// المخالفات
app.get("/violations", async (c) => {
  try {
    const { vehicleId, isPaid } = c.req.query();
    const conditions = [];
    if (vehicleId) conditions.push(eq(trafficViolations.vehicleId, vehicleId));
    if (isPaid !== undefined) conditions.push(eq(trafficViolations.isPaid, isPaid === "true"));

    const result = await db.select().from(trafficViolations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(trafficViolations.violationDate));

    return c.json(result);
  } catch (error) {
    console.error("Error fetching violations:", error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

app.post("/violations", async (c) => {
  try {
    const body = await c.req.json();
    const id = `viol_${nanoid(12)}`;

    await db.insert(trafficViolations).values({
      id,
      vehicleId: body.vehicleId,
      driverId: body.driverId || null,
      violationType: body.violationType || null,
      description: body.description || null,
      location: body.location || null,
      fineAmount: body.fineAmount || null,
      isPaid: false,
      violationDate: body.violationDate ? new Date(body.violationDate) : new Date(),
      notes: body.notes || null,
      createdAt: new Date(),
    });

    return c.json({ id }, 201);
  } catch (error) {
    console.error("Error creating violation:", error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

app.patch("/violations/:id/pay", async (c) => {
  try {
    const { id } = c.req.param();
    const { paidBy } = await c.req.json();

    await db.update(trafficViolations).set({
      isPaid: true,
      paidAt: new Date(),
      paidBy: paidBy || null,
    }).where(eq(trafficViolations.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error("Error updating violation:", error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;
