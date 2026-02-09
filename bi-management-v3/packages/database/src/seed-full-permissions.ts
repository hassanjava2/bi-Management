/**
 * تحميل الصلاحيات الكاملة (743) من ملف SQL القديم إلى PostgreSQL
 * يشغّل من جذر المستودع: npx tsx packages/database/src/seed-full-permissions.ts
 * أو من packages/database: npm run db:seed:full
 */
import "dotenv/config";
import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://bi_v3:BiV3Secure2024@localhost:5433/bi_management_v3";

async function run() {
  // مسار ملف الصلاحيات: من جذر المشروع الرئيسي (bi Management). عند التشغيل من packages/database، __dirname = .../packages/database/src
  const sqlPath = path.resolve(__dirname, "../../../../database/seeds/permissions_seed.sql");
  if (!fs.existsSync(sqlPath)) {
    console.error("ملف الصلاحيات غير موجود:", sqlPath);
    console.error("تأكد من تشغيل السكربت من جذر المستودع (bi Management) أو وجود المسار الصحيح.");
    process.exit(1);
  }

  let content = fs.readFileSync(sqlPath, "utf8");

  // تحويل من SQLite إلى PostgreSQL

  // 1) أدوار: INSERT OR REPLACE → INSERT ... ON CONFLICT
  content = content.replace(
    /INSERT OR REPLACE INTO roles \(id, name, name_ar, description, security_level, is_system, color, icon\) VALUES/g,
    "INSERT INTO roles (id, name, name_ar, description, security_level, is_system, color, icon) VALUES"
  );
  content = content.replace(
    /\('role_viewer', 'viewer', 'مشاهد', 'مشاهدة فقط - بدون تعديل', 0, 1, '#6B7280', 'Eye'\);/,
    "('role_viewer', 'viewer', 'مشاهد', 'مشاهدة فقط - بدون تعديل', 0, 1, '#6B7280', 'Eye') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, name_ar = EXCLUDED.name_ar, description = EXCLUDED.description, security_level = EXCLUDED.security_level, is_system = EXCLUDED.is_system, color = EXCLUDED.color, icon = EXCLUDED.icon, updated_at = NOW();"
  );

  // 2) صلاحيات: INSERT OR REPLACE → INSERT ... ON CONFLICT
  content = content.replace(
    /INSERT OR REPLACE INTO permissions \(id, code, name_ar, module, feature, action, is_sensitive, security_level\) VALUES/g,
    "INSERT INTO permissions (id, code, name_ar, module, feature, action, is_sensitive, security_level) VALUES"
  );
  content = content.replace(
    /\('perm_1814', 'goals\.report', 'تقارير الأهداف', 'goals', 'report', 'view', 0, 2\);/,
    "('perm_1814', 'goals.report', 'تقارير الأهداف', 'goals', 'report', 'view', 0, 2) ON CONFLICT (code) DO UPDATE SET name_ar = EXCLUDED.name_ar, module = EXCLUDED.module, feature = EXCLUDED.feature, action = EXCLUDED.action, is_sensitive = EXCLUDED.is_sensitive, security_level = EXCLUDED.security_level;"
  );

  // 3) role_permissions: جدول v3 بدون عمود id
  content = content.replace(
    /INSERT OR REPLACE INTO role_permissions \(id, role_id, permission_id, granted_by\)[\s\S]*?WHERE roles\.id IN \('role_super_admin', 'role_owner'\);/,
    `INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT roles.id, permissions.id, 'system'
FROM roles, permissions
WHERE roles.id IN ('role_super_admin', 'role_owner')
ON CONFLICT (role_id, permission_id) DO NOTHING;`
  );

  const sql = postgres(connectionString, { max: 1 });
  try {
    console.log("تشغيل بذرة الصلاحيات الكاملة (743) على PostgreSQL...");
    await sql.unsafe(content);
    console.log("تم تحميل الأدوار والصلاحيات وربط super_admin و owner بكل الصلاحيات.");
  } catch (e) {
    console.error("خطأ:", e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
