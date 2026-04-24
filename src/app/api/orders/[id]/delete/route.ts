import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, statusHistory } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (order.status !== "draft") return NextResponse.json({ error: "Only draft orders can be deleted" }, { status: 400 });

  await db.delete(statusHistory).where(eq(statusHistory.orderId, id));
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
  return NextResponse.json({ success: true });
}
