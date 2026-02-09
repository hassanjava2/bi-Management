/**
 * Seed: بيانات BI للحاسبات الكاملة
 * - 12 دور
 * - 743 صلاحية
 * - 6 أقسام + 10 مناصب
 * - 14 موظف
 * - 28 تصنيف + 793 منتج
 * - معلومات الشركة
 * 
 * تشغيل: npm run db:seed (بعد db:migrate)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db } from "./client.js";
import { roles, users, permissions, categories, products, departments, positions, employees } from "./schema/index.js";
import { PERMISSIONS_SAMPLE } from "./seeds/permissions-sample.js";
import { DEPARTMENTS, POSITIONS, EMPLOYEES, COMPANY_INFO } from "./seeds/company-data.js";
import { CATEGORIES } from "./seeds/categories-data.js";
import { loadProducts } from "./seeds/products-data.js";

const ROLES = [
  { id: "role_super_admin", name: "super_admin", nameAr: "المدير العام", description: "كل الصلاحيات", securityLevel: 5, isSystem: 1, color: "#DC2626", icon: "Crown" },
  { id: "role_owner", name: "owner", nameAr: "المالك", description: "صلاحيات المالك", securityLevel: 5, isSystem: 1, color: "#7C3AED", icon: "Building" },
  { id: "role_admin", name: "admin", nameAr: "مدير النظام", description: "إدارة النظام", securityLevel: 4, isSystem: 1, color: "#2563EB", icon: "Shield" },
  { id: "role_manager", name: "manager", nameAr: "مدير فرع", description: "إدارة الفرع", securityLevel: 3, isSystem: 1, color: "#059669", icon: "Briefcase" },
  { id: "role_accountant", name: "accountant", nameAr: "محاسب", description: "العمليات المالية", securityLevel: 2, isSystem: 1, color: "#D97706", icon: "Calculator" },
  { id: "role_salesperson", name: "salesperson", nameAr: "موظف مبيعات", description: "البيع وخدمة العملاء", securityLevel: 1, isSystem: 1, color: "#0891B2", icon: "ShoppingCart" },
  { id: "role_warehouse", name: "warehouse_keeper", nameAr: "أمين مخزن", description: "إدارة المخزون", securityLevel: 1, isSystem: 1, color: "#4F46E5", icon: "Package" },
  { id: "role_inspector", name: "inspector", nameAr: "فاحص", description: "فحص الأجهزة", securityLevel: 1, isSystem: 1, color: "#7C3AED", icon: "Search" },
  { id: "role_preparer", name: "preparer", nameAr: "مجهز", description: "تجهيز الطلبات", securityLevel: 1, isSystem: 1, color: "#10B981", icon: "Wrench" },
  { id: "role_delivery", name: "delivery", nameAr: "موظف توصيل", description: "التوصيل", securityLevel: 1, isSystem: 1, color: "#F59E0B", icon: "Truck" },
  { id: "role_technician", name: "technician", nameAr: "فني صيانة", description: "الصيانة", securityLevel: 1, isSystem: 1, color: "#6366F1", icon: "Settings" },
  { id: "role_viewer", name: "viewer", nameAr: "مشاهد", description: "مشاهدة فقط", securityLevel: 0, isSystem: 1, color: "#6B7280", icon: "Eye" },
];

async function seed() {
  console.log("=".repeat(50));
  console.log("🚀 بدء تحميل بيانات BI للحاسبات...");
  console.log("=".repeat(50));

  // 1. الأدوار
  console.log("\n📋 1/7 - إضافة الأدوار (12)...");
  for (const r of ROLES) {
    await db.insert(roles).values({
      id: r.id,
      name: r.name,
      nameAr: r.nameAr,
      description: r.description,
      securityLevel: r.securityLevel,
      isSystem: r.isSystem,
      color: r.color,
      icon: r.icon,
    }).onConflictDoNothing();
  }
  console.log("✅ تم إضافة 12 دور");

  // 2. الصلاحيات
  console.log("\n🔐 2/7 - إضافة الصلاحيات (" + PERMISSIONS_SAMPLE.length + ")...");
  let permCount = 0;
  for (const p of PERMISSIONS_SAMPLE) {
    await db.insert(permissions).values({
      id: p.id,
      code: p.code,
      nameAr: p.nameAr,
      module: p.module,
      feature: p.feature,
      action: p.action,
      isSensitive: p.isSensitive,
      securityLevel: p.securityLevel,
    }).onConflictDoNothing({ target: permissions.code });
    permCount++;
  }
  console.log(`✅ تم إضافة ${permCount} صلاحية`);

  // 3. الأقسام
  console.log("\n🏢 3/7 - إضافة الأقسام (" + DEPARTMENTS.length + ")...");
  for (const d of DEPARTMENTS) {
    await db.insert(departments).values({
      id: d.id,
      code: d.code,
      name: d.name,
      nameAr: d.nameAr,
      isActive: d.isActive,
    }).onConflictDoNothing();
  }
  console.log(`✅ تم إضافة ${DEPARTMENTS.length} قسم`);

  // 4. المناصب
  console.log("\n💼 4/7 - إضافة المناصب (" + POSITIONS.length + ")...");
  for (const pos of POSITIONS) {
    await db.insert(positions).values({
      id: pos.id,
      code: pos.code,
      name: pos.name,
      nameAr: pos.nameAr,
      departmentId: pos.departmentId,
      level: pos.level,
      isActive: 1,
    }).onConflictDoNothing();
  }
  console.log(`✅ تم إضافة ${POSITIONS.length} منصب`);

  // 5. الموظفين (مع مستخدميهم)
  console.log("\n👥 5/7 - إضافة الموظفين (" + EMPLOYEES.length + ")...");
  const passwordHash = await bcrypt.hash("1111", 10);
  
  for (const emp of EMPLOYEES) {
    // إنشاء مستخدم
    const userId = `user_${emp.employeeCode.toLowerCase().replace("-", "_")}`;
    const username = emp.email.split("@")[0];
    const roleId = emp.isOwner ? "role_owner" : "role_salesperson";
    const secLevel = emp.isOwner ? 5 : 1;
    
    await db.insert(users).values({
      id: userId,
      username: username,
      email: emp.email,
      passwordHash,
      fullName: emp.fullName,
      phone: emp.phone,
      roleId: roleId,
      role: emp.isOwner ? "owner" : "employee",
      isActive: 1,
      securityLevel: secLevel,
    }).onConflictDoNothing({ target: users.username });

    // إنشاء سجل الموظف
    await db.insert(employees).values({
      id: emp.id,
      userId: userId,
      employeeCode: emp.employeeCode,
      departmentId: emp.departmentId,
      positionId: emp.positionId,
      salary: emp.salary,
      workStartTime: emp.workStartTime,
      workEndTime: emp.workEndTime,
      hireDate: emp.hireDate,
      emergencyContact: emp.emergencyContact,
      emergencyPhone: emp.emergencyPhone,
      isActive: 1,
    }).onConflictDoNothing();
  }
  console.log(`✅ تم إضافة ${EMPLOYEES.length} موظف مع مستخدميهم`);

  // 6. التصنيفات
  console.log("\n📁 6/7 - إضافة التصنيفات (" + CATEGORIES.length + ")...");
  for (const cat of CATEGORIES) {
    await db.insert(categories).values({
      id: cat.id,
      code: cat.code,
      name: cat.name,
      nameAr: cat.nameAr,
      sortOrder: cat.sortOrder,
      isActive: 1,
    }).onConflictDoNothing();
  }
  console.log(`✅ تم إضافة ${CATEGORIES.length} تصنيف`);

  // 7. المنتجات
  console.log("\n📦 7/7 - إضافة المنتجات...");
  const PRODUCTS = loadProducts();
  let prodCount = 0;
  for (const prod of PRODUCTS) {
    await db.insert(products).values({
      id: prod.id,
      code: prod.code,
      name: prod.name,
      nameAr: prod.nameAr,
      categoryId: prod.categoryId,
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      quantity: prod.quantity,
      minQuantity: prod.minQuantity,
      unit: prod.unit,
      warrantyMonths: prod.warrantyMonths,
      isActive: prod.isActive,
    }).onConflictDoNothing();
    prodCount++;
    if (prodCount % 100 === 0) {
      console.log(`  ... ${prodCount} منتج`);
    }
  }
  console.log(`✅ تم إضافة ${prodCount} منتج`);

  // إضافة مستخدم admin الافتراضي (كلمة مرور عشوائية - غيّرها عند أول دخول)
  const adminPassword =
    process.env.ADMIN_SEED_PASSWORD || "Bi" + randomBytes(8).toString("hex");
  const adminPasswordHash = await bcrypt.hash(adminPassword, 12);

  await db.insert(users).values({
    id: "user_admin_default",
    username: "admin",
    email: "admin@bi.local",
    passwordHash: adminPasswordHash,
    fullName: "مدير النظام",
    roleId: "role_admin",
    role: "admin",
    isActive: 1,
    securityLevel: 4,
  }).onConflictDoNothing({ target: users.username });

  console.log("\n" + "=".repeat(50));
  console.log("🎉 تم الانتهاء من تحميل جميع البيانات!");
  console.log("=".repeat(50));
  console.log(`
📊 ملخص البيانات:
   • الأدوار: 12
   • الصلاحيات: ${PERMISSIONS_SAMPLE.length}
   • الأقسام: ${DEPARTMENTS.length}
   • المناصب: ${POSITIONS.length}
   • الموظفين: ${EMPLOYEES.length}
   • التصنيفات: ${CATEGORIES.length}
   • المنتجات: ${prodCount}

🔐 معلومات الشركة:
   • الاسم: ${COMPANY_INFO.name}
   • الاسم الكامل: ${COMPANY_INFO.fullName}
   • المالك: ${COMPANY_INFO.owner}
   • الموقع: ${COMPANY_INFO.location}

👤 المستخدم الافتراضي (admin):
   • اسم المستخدم: admin
   • كلمة المرور: ${adminPassword}
   ⚠️  غيّر كلمة المرور عند أول دخول. لا تشاركها.
  `);
}

seed().catch(console.error).finally(() => process.exit(0));
