import { db } from "@/db";
import { orders } from "@/db/schema";
import { like } from "drizzle-orm";

export async function generateOrderId(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `LBT-${year}-`;
  const existing = await db
    .select({ id: orders.id })
    .from(orders)
    .where(like(orders.id, `${prefix}%`));
  const next = String(existing.length + 1).padStart(3, "0");
  return `${prefix}${next}`;
}
