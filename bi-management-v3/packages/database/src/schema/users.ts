import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { roles } from "./permissions";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  roleId: text("role_id").references(() => roles.id),
  role: text("role").default("viewer"),
  isActive: integer("is_active").default(1),
  isLocked: integer("is_locked").default(0),
  securityLevel: integer("security_level").default(1),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
  isDeleted: integer("is_deleted").default(0),
  deletedAt: timestamp("deleted_at"),
  deletedBy: text("deleted_by"),
}, (table) => [
  index("users_role_id_idx").on(table.roleId),
  index("users_created_by_idx").on(table.createdBy),
  index("users_is_active_idx").on(table.isActive),
  index("users_is_locked_idx").on(table.isLocked),
  index("users_is_deleted_idx").on(table.isDeleted),
  index("users_created_at_idx").on(table.createdAt),
  index("users_last_login_at_idx").on(table.lastLoginAt),
]);
