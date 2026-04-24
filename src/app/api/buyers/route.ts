import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { buyers } from "@/db/schema";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const all = await db.select().from(buyers).orderBy(buyers.createdAt);
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const [buyer] = await db.insert(buyers).values({
    id: crypto.randomUUID(),
    name: body.name,
    company: body.company || null,
    email: body.email || null,
    country: body.country || null,
    phone: body.phone || null,
  }).returning();

  return NextResponse.json(buyer);
}