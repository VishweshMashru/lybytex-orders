import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  const hash = await bcrypt.hash("lybytex@2026", 12);

  const existing = await db.select().from(users).where(eq(users.email, "vishweshmash86@gmail.com")).limit(1);

  if (existing.length > 0) {
    await db.update(users).set({ password: hash }).where(eq(users.email, "vishweshmash86@gmail.com"));
    console.log("✅ Password updated");
  } else {
    await db.insert(users).values({
      name: "Vish (Admin)",
      email: "vishweshmash86@gmail.com",
      password: hash,
      role: "admin",
      active: true,
    });
    console.log("✅ Admin user created");
  }

  console.log("   Email:    vishweshmash86@gmail.com");
  console.log("   Password: lybytex@2026");
}

seed().catch(console.error);