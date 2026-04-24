import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, statusHistory, buyers, itemChangeLogs, itemProgress } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const isAdmin = session.user.role === "admin";

  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && order.buyerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, order.buyerId));
  const history = await db.select().from(statusHistory).where(eq(statusHistory.orderId, id));
  const changeLogs = await db.select().from(itemChangeLogs).where(eq(itemChangeLogs.orderId, id));
  const progressData = await db.select().from(itemProgress).where(eq(itemProgress.orderId, id));
  const total = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
  return NextResponse.json({ ...order, items, buyer, history, changeLogs, progressData, total });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await req.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.awbNumber !== undefined) updates.awbNumber = body.awbNumber;
  if (body.productionProgress !== undefined) updates.productionProgress = Math.min(100, Math.max(0, parseInt(body.productionProgress)));
  if (body.notes !== undefined) updates.notes = body.notes;
  if (body.shippingAddress !== undefined) updates.shippingAddress = body.shippingAddress;
  if (body.status === "dispatched") updates.dispatchedAt = new Date();
  if (body.status === "delivered") updates.deliveredAt = new Date();
  if (body.status === "paid") updates.paidAt = new Date();

  const [updated] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
  if (body.status) {
    await db.insert(statusHistory).values({ orderId: id, status: body.status, note: body.statusNote || null, changedBy: session.user.id });
  }
  return NextResponse.json(updated);
}