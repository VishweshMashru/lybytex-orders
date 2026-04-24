"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:         { label: "Draft",         color: "#888",    bg: "rgba(255,255,255,0.06)" },
  confirmed:     { label: "Confirmed",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  in_production: { label: "In Production", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  dispatched:    { label: "Dispatched",    color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  delivered:     { label: "Delivered",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  paid:          { label: "Paid",          color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const isAdmin = session?.user?.role === "admin";

  useEffect(() => {
    fetch("/api/orders").then((r) => r.json()).then((d) => { setOrders(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  const q = search.toLowerCase().trim();
  const filtered = orders.filter((o) => {
    const matchStatus = filter === "all" || o.status === filter;
    const matchSearch = !q ||
      o.id?.toLowerCase().includes(q) ||
      o.buyer?.name?.toLowerCase().includes(q) ||
      o.buyer?.company?.toLowerCase().includes(q) ||
      o.buyer?.country?.toLowerCase().includes(q) ||
      o.awbNumber?.toLowerCase().includes(q) ||
      o.invoiceNumber?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const totalValue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const unpaidValue = orders.filter((o) => o.status !== "paid").reduce((s, o) => s + (o.total || 0), 0);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isAdmin ? "All Orders" : "Your Orders"}</h1>
          {!isAdmin && <p style={{ fontSize: 13, color: "var(--text2)", marginTop: 4 }}>Welcome back, {session?.user?.name}</p>}
        </div>
        {isAdmin && (
          <Link href="/orders/new" style={{ background: "var(--text)", color: "var(--bg)", padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            + New Order
          </Link>
        )}
      </div>

      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28 }}>
          {[
            { label: "Total Orders", value: orders.length },
            { label: "In Production", value: orders.filter((o) => o.status === "in_production").length },
            { label: "Total Value", value: `$${totalValue.toFixed(0)}` },
            { label: "Outstanding", value: `$${unpaidValue.toFixed(0)}`, warn: unpaidValue > 0 },
          ].map((s) => (
            <div key={s.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "16px 20px" }}>
              <p style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 26, fontWeight: 700, margin: "6px 0 0", color: (s as any).warn ? "var(--amber)" : "var(--text)" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search + filters row */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search orders, buyers, AWB…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px", background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "var(--text)",
            outline: "none", minWidth: 0,
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--border2)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
        />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
          {["all", ...Object.keys(STATUS_META)].map((s) => {
            const count = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
            const active = filter === s;
            return (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                whiteSpace: "nowrap", cursor: "pointer", border: "none",
                background: active ? "var(--text)" : "var(--surface)",
                color: active ? "var(--bg)" : "var(--text2)",
                outline: active ? "none" : "1px solid var(--border)",
              }}>
                {s === "all" ? "All" : STATUS_META[s].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results count when searching */}
      {q && (
        <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </p>
      )}

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
            {q ? `No orders matching "${search}".` : orders.length === 0 ? "No orders yet." : "No orders match this filter."}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Order ID", ...(isAdmin ? ["Buyer"] : []), "Status", "Total (USD)", "Date", "AWB", ""].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: h === "Total (USD)" ? "right" : "left", fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, i) => {
                const meta = STATUS_META[order.status];
                return (
                  <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text2)" }}>{order.id}</td>
                    {isAdmin && (
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 500 }}>{order.buyer?.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>{order.buyer?.country}</div>
                      </td>
                    )}
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>${order.total?.toFixed(2)}</td>
                    <td style={{ padding: "12px 16px", color: "var(--text3)", fontSize: 12 }}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>{order.awbNumber || "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <Link href={`/orders/${order.id}`} style={{ color: "var(--blue)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}