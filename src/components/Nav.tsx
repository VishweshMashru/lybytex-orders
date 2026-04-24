"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "admin";

  if (pathname === "/login") return null;

  const links = [
    { href: "/", label: "Orders" },
    ...(isAdmin ? [{ href: "/buyers", label: "Buyers" }] : []),
  ];

  return (
    <nav style={{
      background: "var(--surface)", borderBottom: "1px solid var(--border)",
      position: "sticky", top: 0, zIndex: 50,
    }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}>
            LYBYTEX <span style={{ color: "var(--text3)", fontWeight: 400 }}>ORDERS</span>
          </span>
          <div style={{ display: "flex", gap: 2 }}>
            {links.map((l) => (
              <Link key={l.href} href={l.href} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 13, fontWeight: 500,
                textDecoration: "none", transition: "background 0.15s",
                background: pathname === l.href ? "var(--surface2)" : "transparent",
                color: pathname === l.href ? "var(--text)" : "var(--text2)",
              }}>{l.label}</Link>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>{session?.user?.email}</span>
          <button onClick={() => signOut({ callbackUrl: "/login" })} style={{
            fontSize: 12, color: "var(--text3)", background: "none", border: "1px solid var(--border)",
            borderRadius: 6, padding: "4px 10px", cursor: "pointer",
          }}>Sign out</button>
        </div>
      </div>
    </nav>
  );
}
