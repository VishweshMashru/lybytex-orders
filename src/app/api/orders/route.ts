import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, statusHistory, buyers } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { generateOrderId } from "@/lib/order-id";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = session.user.role === "admin";
  const allOrders = isAdmin
    ? await db.select().from(orders).orderBy(desc(orders.createdAt))
    : await db.select().from(orders).where(eq(orders.buyerId, session.user.id)).orderBy(desc(orders.createdAt));

  if (allOrders.length === 0) return NextResponse.json([]);

  // 3 queries total regardless of order count — no more N+1
  const orderIds = allOrders.map((o) => o.id);
  const buyerIds = [...new Set(allOrders.map((o) => o.buyerId))];

  const [allItems, allBuyers] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    db.select().from(buyers).where(inArray(buyers.id, buyerIds)),
  ]);

  const itemsByOrder = allItems.reduce((acc, item) => {
    acc[item.orderId] = acc[item.orderId] || [];
    acc[item.orderId].push(item);
    return acc;
  }, {} as Record<string, typeof allItems>);

  const buyersById = allBuyers.reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {} as Record<string, (typeof allBuyers)[0]>);

  const enriched = allOrders.map((order) => {
    const items = itemsByOrder[order.id] || [];
    const total = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);
    return { ...order, items, buyer: buyersById[order.buyerId] ?? null, total };
  });

  return NextResponse.json(enriched);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const orderId = await generateOrderId();
  const invoiceNumber = `INV-${orderId.replace("LBT-", "")}`;

  const [order] = await db.insert(orders).values({
    id: orderId, buyerId: body.buyerId, status: "draft",
    currency: "USD", notes: body.notes, shippingAddress: body.shippingAddress, invoiceNumber,
  }).returning();

  if (body.items?.length) {
    await db.insert(orderItems).values(
      body.items.map((item: any) => ({
        orderId, description: item.description, quantity: item.quantity,
        unit: item.unit || "metres", unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.quantity) * parseFloat(item.unitPrice)).toFixed(2),
      }))
    );
  }

  await db.insert(statusHistory).values({ orderId, status: "draft", note: "Order created", changedBy: session.user.id });
  return NextResponse.json(order);
}