import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orderItems, itemChangeLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  if (!body.items?.length) return NextResponse.json({ error: "At least one item required" }, { status: 400 });

  // Grab old items for snapshot
  const oldItems = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

  // Replace items
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  const inserted = await db.insert(orderItems).values(
    body.items.map((item: any) => ({
      orderId: id,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit || "metres",
      unitPrice: item.unitPrice,
      totalPrice: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2),
    }))
  ).returning();

  // Store change log
  if (body.reason) {
    const snapshot = JSON.stringify({
      before: oldItems.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice })),
      after: body.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice })),
    });
    await db.insert(itemChangeLogs).values({
      orderId: id,
      reason: body.reason,
      snapshot,
      changedBy: session.user.id,
    });
  }

  return NextResponse.json(inserted);
}