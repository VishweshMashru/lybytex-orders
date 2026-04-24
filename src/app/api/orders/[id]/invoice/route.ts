import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, buyers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateInvoicePDF } from "@/lib/invoice-pdf";

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
  const subtotal = items.reduce((sum, i) => sum + parseFloat(i.totalPrice), 0);

  const pdfBytes = await generateInvoicePDF({
    orderId: order.id, invoiceNumber: order.invoiceNumber ?? order.id,
    date: new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    buyer: { name: buyer.name, company: buyer.company, email: buyer.email, country: buyer.country },
    items: items.map((i) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unitPrice: i.unitPrice, totalPrice: i.totalPrice })),
    subtotal, notes: order.notes, shippingAddress: order.shippingAddress,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Invoice-${order.invoiceNumber}.pdf"`,
    },
  });
}
