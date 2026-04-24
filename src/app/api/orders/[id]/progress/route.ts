import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { itemProgress } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { orderItemId, completed } = await req.json();

  // Upsert — update if exists, insert if not
  const existing = await db.select().from(itemProgress)
    .where(and(eq(itemProgress.orderId, id), eq(itemProgress.orderItemId, orderItemId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(itemProgress)
      .set({ completed: String(completed), updatedAt: new Date() })
      .where(eq(itemProgress.id, existing[0].id));
  } else {
    await db.insert(itemProgress).values({
      orderItemId, orderId: id, completed: String(completed),
    });
  }

  return NextResponse.json({ success: true });
}