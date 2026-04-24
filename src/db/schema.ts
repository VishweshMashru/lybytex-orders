import { pgTable, text, integer, decimal, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("orders_role", ["admin", "buyer"]);

export const orderStatusEnum = pgEnum("order_status", [
  "draft", "confirmed", "in_production", "dispatched", "delivered", "paid",
]);

// Users for the orders portal (separate from inventory app users)
export const users = pgTable("orders_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("buyer").notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buyers = pgTable("buyers", {
  id: text("id").primaryKey(), // references users.id
  name: text("name").notNull(),
  company: text("company"),
  email: text("email"),
  country: text("country"),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  buyerId: text("buyer_id").references(() => buyers.id).notNull(),
  status: orderStatusEnum("status").default("draft").notNull(),
  currency: text("currency").default("USD").notNull(),
  notes: text("notes"),
  shippingAddress: text("shipping_address"),
  awbNumber: text("awb_number"),
  productionProgress: integer("production_progress").default(0), // 0-100
  invoiceNumber: text("invoice_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  dispatchedAt: timestamp("dispatched_at"),
  deliveredAt: timestamp("delivered_at"),
  paidAt: timestamp("paid_at"),
});

export const orderItems = pgTable("order_items", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").default("metres").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const itemChangeLogs = pgTable("item_change_logs", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  reason: text("reason").notNull(),
  snapshot: text("snapshot").notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changedBy: text("changed_by"),
});

export const itemProgress = pgTable("item_progress", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderItemId: integer("order_item_id").references(() => orderItems.id).notNull(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  completed: decimal("completed", { precision: 10, scale: 2 }).default("0").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const statusHistory = pgTable("status_history", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  orderId: text("order_id").references(() => orders.id).notNull(),
  status: orderStatusEnum("status").notNull(),
  note: text("note"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  changedBy: text("changed_by"),
});