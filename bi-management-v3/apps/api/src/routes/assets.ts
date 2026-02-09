import { Hono } from "hono";
import { db, fixedAssets, assetCategories, depreciationRecords, assetMaintenance, assetTransfers, users, branches, departments } from "@bi-management/database";
import { eq, desc, like, sql, and, or, gte, lte } from "drizzle-orm";
import { authMiddleware } from "../lib/auth.js";

const app = new Hono();

// ==================== CATEGORIES ====================

// GET /assets/categories - List asset categories
app.get("/categories", async (c) => {
  try {
    const items = await db.select().from(assetCategories).orderBy(assetCategories.name);
    return c.json({ items, total: items.length });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /assets/categories - Create category
app.post("/categories", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `CAT-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(assetCategories).values({
      id,
      code,
      name: body.name,
      nameAr: body.nameAr,
      parentId: body.parentId,
      depreciationMethod: body.depreciationMethod || "straight_line",
      usefulLifeYears: body.usefulLifeYears,
      salvageValuePercent: body.salvageValuePercent || 0,
      assetAccountId: body.assetAccountId,
      depreciationAccountId: body.depreciationAccountId,
      accumulatedDepAccountId: body.accumulatedDepAccountId,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== FIXED ASSETS ====================

// GET /assets - List fixed assets
app.get("/", async (c) => {
  try {
    const { search, categoryId, branchId, status, limit = "50", offset = "0" } = c.req.query();

    let query = db
      .select({
        asset: fixedAssets,
        category: assetCategories,
        branch: branches,
        assignee: users,
      })
      .from(fixedAssets)
      .leftJoin(assetCategories, eq(fixedAssets.categoryId, assetCategories.id))
      .leftJoin(branches, eq(fixedAssets.branchId, branches.id))
      .leftJoin(users, eq(fixedAssets.assignedTo, users.id));

    const conditions = [];
    if (search) {
      conditions.push(or(like(fixedAssets.name, `%${search}%`), like(fixedAssets.nameAr, `%${search}%`), like(fixedAssets.code, `%${search}%`)));
    }
    if (categoryId) conditions.push(eq(fixedAssets.categoryId, categoryId));
    if (branchId) conditions.push(eq(fixedAssets.branchId, branchId));
    if (status) conditions.push(eq(fixedAssets.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const items = await query.orderBy(desc(fixedAssets.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(fixedAssets)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return c.json({
      items: items.map((row) => ({
        ...row.asset,
        category: row.category ? { id: row.category.id, name: row.category.name, nameAr: row.category.nameAr } : null,
        branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
        assignee: row.assignee ? { id: row.assignee.id, name: row.assignee.name } : null,
      })),
      total: Number(count),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /assets/stats - Get asset statistics
app.get("/stats", async (c) => {
  try {
    const [stats] = await db
      .select({
        totalAssets: sql<number>`count(*)`,
        activeAssets: sql<number>`count(*) filter (where ${fixedAssets.status} = 'active')`,
        totalCost: sql<number>`coalesce(sum(${fixedAssets.acquisitionCost}), 0)`,
        totalCurrentValue: sql<number>`coalesce(sum(${fixedAssets.currentValue}), 0)`,
        totalDepreciation: sql<number>`coalesce(sum(${fixedAssets.accumulatedDepreciation}), 0)`,
        disposedAssets: sql<number>`count(*) filter (where ${fixedAssets.status} = 'disposed')`,
        fullyDepreciated: sql<number>`count(*) filter (where ${fixedAssets.status} = 'fully_depreciated')`,
      })
      .from(fixedAssets);

    return c.json(stats);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// GET /assets/:id - Get asset by ID
app.get("/:id", async (c) => {
  try {
    const { id } = c.req.param();

    const [asset] = await db
      .select({
        asset: fixedAssets,
        category: assetCategories,
        branch: branches,
        assignee: users,
      })
      .from(fixedAssets)
      .leftJoin(assetCategories, eq(fixedAssets.categoryId, assetCategories.id))
      .leftJoin(branches, eq(fixedAssets.branchId, branches.id))
      .leftJoin(users, eq(fixedAssets.assignedTo, users.id))
      .where(eq(fixedAssets.id, id));

    if (!asset) return c.json({ error: "Asset not found" }, 404);

    // Get depreciation history
    const depreciation = await db
      .select()
      .from(depreciationRecords)
      .where(eq(depreciationRecords.assetId, id))
      .orderBy(desc(depreciationRecords.periodEnd))
      .limit(12);

    // Get maintenance history
    const maintenance = await db
      .select()
      .from(assetMaintenance)
      .where(eq(assetMaintenance.assetId, id))
      .orderBy(desc(assetMaintenance.scheduledDate))
      .limit(10);

    return c.json({
      ...asset.asset,
      category: asset.category,
      branch: asset.branch,
      assignee: asset.assignee,
      depreciationHistory: depreciation,
      maintenanceHistory: maintenance,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /assets - Create new asset
app.post("/", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `AST-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(fixedAssets).values({
      id,
      code,
      name: body.name,
      nameAr: body.nameAr,
      description: body.description,
      categoryId: body.categoryId,
      branchId: body.branchId,
      departmentId: body.departmentId,
      location: body.location,
      acquisitionDate: body.acquisitionDate,
      acquisitionCost: body.acquisitionCost,
      purchaseInvoiceId: body.purchaseInvoiceId,
      supplierId: body.supplierId,
      serialNumber: body.serialNumber,
      model: body.model,
      manufacturer: body.manufacturer,
      warrantyExpiry: body.warrantyExpiry,
      depreciationMethod: body.depreciationMethod || "straight_line",
      usefulLifeYears: body.usefulLifeYears,
      usefulLifeMonths: body.usefulLifeMonths,
      salvageValue: body.salvageValue || 0,
      depreciationStartDate: body.depreciationStartDate || body.acquisitionDate,
      currentValue: body.acquisitionCost,
      status: "active",
      assignedTo: body.assignedTo,
      barcode: body.barcode,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// PUT /assets/:id - Update asset
app.put("/:id", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db
      .update(fixedAssets)
      .set({
        name: body.name,
        nameAr: body.nameAr,
        description: body.description,
        categoryId: body.categoryId,
        branchId: body.branchId,
        departmentId: body.departmentId,
        location: body.location,
        serialNumber: body.serialNumber,
        model: body.model,
        manufacturer: body.manufacturer,
        warrantyExpiry: body.warrantyExpiry,
        assignedTo: body.assignedTo,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// POST /assets/:id/depreciate - Calculate and record depreciation
app.post("/:id/depreciate", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, id));
    if (!asset) return c.json({ error: "Asset not found" }, 404);

    if (asset.status !== "active") {
      return c.json({ error: "Asset is not active" }, 400);
    }

    // Calculate depreciation
    const currentValue = asset.currentValue || asset.acquisitionCost;
    const salvageValue = asset.salvageValue || 0;
    const usefulLifeMonths = (asset.usefulLifeYears || 5) * 12 + (asset.usefulLifeMonths || 0);

    let depreciationAmount = 0;

    if (asset.depreciationMethod === "straight_line") {
      depreciationAmount = (asset.acquisitionCost - salvageValue) / usefulLifeMonths;
    } else if (asset.depreciationMethod === "declining_balance") {
      const rate = 2 / usefulLifeMonths;
      depreciationAmount = currentValue * rate;
    }

    // Don't depreciate below salvage value
    if (currentValue - depreciationAmount < salvageValue) {
      depreciationAmount = currentValue - salvageValue;
    }

    if (depreciationAmount <= 0) {
      // Mark as fully depreciated
      await db.update(fixedAssets).set({ status: "fully_depreciated", updatedAt: new Date() }).where(eq(fixedAssets.id, id));
      return c.json({ message: "Asset fully depreciated" });
    }

    const newValue = currentValue - depreciationAmount;
    const newAccumulated = (asset.accumulatedDepreciation || 0) + depreciationAmount;

    // Create depreciation record
    const recordId = crypto.randomUUID();
    await db.insert(depreciationRecords).values({
      id: recordId,
      assetId: id,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      openingValue: currentValue,
      depreciationAmount,
      closingValue: newValue,
      accumulatedDepreciation: newAccumulated,
      status: "calculated",
    });

    // Update asset
    await db
      .update(fixedAssets)
      .set({
        currentValue: newValue,
        accumulatedDepreciation: newAccumulated,
        lastDepreciationDate: body.periodEnd,
        status: newValue <= salvageValue ? "fully_depreciated" : "active",
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, id));

    return c.json({
      recordId,
      depreciationAmount,
      newValue,
      accumulatedDepreciation: newAccumulated,
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// POST /assets/:id/dispose - Dispose asset
app.post("/:id/dispose", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db
      .update(fixedAssets)
      .set({
        status: "disposed",
        disposalDate: body.disposalDate,
        disposalMethod: body.disposalMethod,
        disposalValue: body.disposalValue,
        disposalNotes: body.disposalNotes,
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// ==================== MAINTENANCE ====================

// GET /assets/maintenance - List maintenance records
app.get("/maintenance/list", async (c) => {
  try {
    const { assetId, status, limit = "50" } = c.req.query();

    let query = db
      .select({
        maintenance: assetMaintenance,
        asset: fixedAssets,
      })
      .from(assetMaintenance)
      .leftJoin(fixedAssets, eq(assetMaintenance.assetId, fixedAssets.id));

    const conditions = [];
    if (assetId) conditions.push(eq(assetMaintenance.assetId, assetId));
    if (status) conditions.push(eq(assetMaintenance.status, status));

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }

    const items = await query.orderBy(desc(assetMaintenance.scheduledDate)).limit(parseInt(limit));

    return c.json({
      items: items.map((row) => ({
        ...row.maintenance,
        asset: row.asset ? { id: row.asset.id, name: row.asset.name, code: row.asset.code } : null,
      })),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في جلب البيانات" }, 500);
  }
});

// POST /assets/maintenance - Schedule maintenance
app.post("/maintenance", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `MNT-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(assetMaintenance).values({
      id,
      code,
      assetId: body.assetId,
      maintenanceType: body.maintenanceType,
      description: body.description,
      scheduledDate: body.scheduledDate,
      estimatedCost: body.estimatedCost,
      status: "scheduled",
      vendorId: body.vendorId,
      technicianName: body.technicianName,
      notes: body.notes,
      createdBy: body.createdBy,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// PUT /assets/maintenance/:id/complete - Complete maintenance
app.put("/maintenance/:id/complete", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    await db
      .update(assetMaintenance)
      .set({
        status: "completed",
        completedDate: body.completedDate || new Date().toISOString().split("T")[0],
        actualCost: body.actualCost,
        workPerformed: body.workPerformed,
        partsReplaced: body.partsReplaced,
        nextMaintenanceDate: body.nextMaintenanceDate,
        updatedAt: new Date(),
      })
      .where(eq(assetMaintenance.id, id));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

// ==================== TRANSFERS ====================

// POST /assets/transfers - Request asset transfer
app.post("/transfers", async (c) => {
  try {
    const body = await c.req.json();
    const id = crypto.randomUUID();
    const code = `TRF-${Date.now().toString(36).toUpperCase()}`;

    await db.insert(assetTransfers).values({
      id,
      code,
      assetId: body.assetId,
      fromBranchId: body.fromBranchId,
      fromDepartmentId: body.fromDepartmentId,
      fromLocation: body.fromLocation,
      fromAssignee: body.fromAssignee,
      toBranchId: body.toBranchId,
      toDepartmentId: body.toDepartmentId,
      toLocation: body.toLocation,
      toAssignee: body.toAssignee,
      transferDate: body.transferDate,
      reason: body.reason,
      status: "pending",
      notes: body.notes,
      createdBy: body.createdBy,
    });

    return c.json({ id, code }, 201);
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في إنشاء السجل" }, 500);
  }
});

// PUT /assets/transfers/:id/approve - Approve and execute transfer
app.put("/transfers/:id/approve", async (c) => {
  try {
    const { id } = c.req.param();
    const body = await c.req.json();

    const [transfer] = await db.select().from(assetTransfers).where(eq(assetTransfers.id, id));
    if (!transfer) return c.json({ error: "Transfer not found" }, 404);

    // Update transfer status
    await db
      .update(assetTransfers)
      .set({
        status: "completed",
        approvedBy: body.userId,
        approvedAt: new Date(),
      })
      .where(eq(assetTransfers.id, id));

    // Update asset location
    await db
      .update(fixedAssets)
      .set({
        branchId: transfer.toBranchId,
        departmentId: transfer.toDepartmentId,
        location: transfer.toLocation,
        assignedTo: transfer.toAssignee,
        updatedAt: new Date(),
      })
      .where(eq(fixedAssets.id, transfer.assetId || ""));

    return c.json({ success: true });
  } catch (error) {
    console.error(error);
    return c.json({ error: "فشل في تحديث البيانات" }, 500);
  }
});

export default app;
