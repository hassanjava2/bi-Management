/**
 * Drizzle ORM relations for relational query API (with: { ... })
 * Defines relations for core entities; extend as needed for other tables.
 */
import { relations } from "drizzle-orm";
import { products } from "./products";
import { categories } from "./categories";
import { invoices, invoiceItems } from "./invoices";
import { users } from "./users";
import { roles, permissions, rolePermissions } from "./permissions";
import { customers } from "./customers";
import { suppliers } from "./suppliers";
import { branches } from "./branches";
import { warehouses } from "./warehouses";

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  supplier: one(suppliers, { fields: [invoices.supplierId], references: [suppliers.id] }),
  branch: one(branches, { fields: [invoices.branchId], references: [branches.id] }),
  warehouse: one(warehouses, { fields: [invoices.warehouseId], references: [warehouses.id] }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
  product: one(products, { fields: [invoiceItems.productId], references: [products.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  role: one(roles, { fields: [users.roleId], references: [roles.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  invoices: many(invoices),
}));

export const suppliersRelations = relations(suppliers, ({ many }) => ({
  invoices: many(invoices),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  invoices: many(invoices),
}));

export const warehousesRelations = relations(warehouses, ({ many }) => ({
  invoices: many(invoices),
}));
