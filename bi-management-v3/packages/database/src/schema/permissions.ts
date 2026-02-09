import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  module: text("module").notNull(),
  feature: text("feature").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  isSensitive: integer("is_sensitive").default(0),
  requires2fa: integer("requires_2fa").default(0),
  requiresApproval: integer("requires_approval").default(0),
  securityLevel: integer("security_level").default(1),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roles = pgTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  nameAr: text("name_ar"),
  description: text("description"),
  securityLevel: integer("security_level").default(1),
  isSystem: integer("is_system").default(0),
  isActive: integer("is_active").default(1),
  color: text("color").default("#3B82F6"),
  icon: text("icon").default("Shield"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    grantedAt: timestamp("granted_at").defaultNow(),
    grantedBy: text("granted_by"),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);
