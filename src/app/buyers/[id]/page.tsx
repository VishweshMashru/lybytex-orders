"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:         { label: "Draft",         color: "#888",    bg: "rgba(255,255,255,0.06)" },
  confirmed:     { label: "Confirmed",     color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  in_production: { label: "In Production", color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  dispatched:    { label: "Dispatched",    color: "#c084fc", bg: "rgba(192,132,252,0.12)" },
  delivered:     { label: "Delivered",     color: "#34d399", bg: "rgba(52,211,153,0.12)" },
  paid:          { label: "Paid",          color: "#10b981", bg: "rgba(16,185,129,0.15)" },
};

const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20,
};

const inputStyle: React.CSSProperties = {
  background: "var(--surface2)", border: "1px solid var(--border2)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: "100%",
};

export default function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  const [buyer, setBuyer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!isAdmin && session) { router.push("/"); return; }
    Promise.all([
      fetch(`/api/buyers/${id}`).then((r) => r.json()),
      fetch("/api/orders").then((r) => r.json()),
    ]).then(([buyerData, allOrders]) => {
      setBuyer(buyerData);
      setOrders(Array.isArray(allOrders) ? allOrders.filter((o: any) => o.buyerId === id) : []);
      setLoading(false);
    });
  }, [id, isAdmin, session]);

  const openEdit = () => {
    setEditName(buyer.name || "");
    setEditCompany(buyer.company || "");
    setEditEmail(buyer.email || "");
    setEditCountry(buyer.country || "");
    setEditPhone(buyer.phone || "");
    setEditError("");
    setShowEdit(true);
  };

  const handleSave = async () => {
    if (!editName.trim()) { setEditError("Name is required."); return; }
    setSaving(true); setEditError("");
    const res = await fetch(`/api/buyers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, company: editCompany, email: editEmail, country: editCountry, phone: editPhone }),
    });
    if (res.ok) {
      setBuyer(await res.json());
      setShowEdit(false);
    } else {
      setEditError((await res.json()).error || "Failed to save.");
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--text3)" }}>Loading…</div>;
  if (!buyer || buyer.error) return <div style={{ padding: 60, textAlign: "center", color: "var(--red)" }}>Buyer not found.</div>;

  const totalSpend = orders.reduce((s, o) => s + (o.total || 0), 0);
  const paidOrders = orders.filter((o) => o.status === "paid");
  const activeOrders = orders.filter((o) => !["paid", "draft"].includes(o.status));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/buyers" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>← Buyers</Link>
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "var(--text2)", flexShrink: 0 }}>
              {buyer.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{buyer.name}</h1>
              {buyer.company && <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 4px" }}>{buyer.company}</p>}
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {buyer.email && <span style={{ fontSize: 12, color: "var(--text3)" }}>{buyer.email}</span>}
                {buyer.phone && <span style={{ fontSize: 12, color: "var(--text3)" }}>{buyer.phone}</span>}
                {buyer.country && <span style={{ fontSize: 11, background: "var(--surface2)", color: "var(--text3)", padding: "2px 8px", borderRadius: 20 }}>{buyer.country}</span>}
              </div>
              {!buyer.email && !buyer.phone && <p style={{ fontSize: 12, color: "var(--text3)", opacity: 0.5 }}>No contact info</p>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button onClick={openEdit} style={{
              padding: "7px 14px", background: "var(--surface2)", border: "1px solid var(--border2)",
              borderRadius: 8, fontSize: 13, color: "var(--text2)", cursor: "pointer", fontWeight: 500,
            }}>✏️ Edit</button>
            <Link href={`/orders/new?buyerId=${id}`} style={{
              padding: "7px 14px", background: "var(--text)", color: "var(--bg)",
              borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}>+ New Order</Link>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          {[
            { label: "Total Orders", value: orders.length },
            { label: "Active", value: activeOrders.length },
            { label: "Total Spend", value: `$${totalSpend.toFixed(0)}` },
            { label: "Paid Orders", value: paidOrders.length },
          ].map((s) => (
            <div key={s.label}>
              <p style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>{s.label}</p>
              <p style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 0" }}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: 12, fontWeight: 600, margin: 0, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Order History</h2>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>No orders yet for this buyer.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Order ID", "Status", "Total (USD)", "Date", "AWB", ""].map((h, i) => (
                  <th key={h} style={{ padding: "9px 16px", textAlign: i === 2 ? "right" : "left", fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => {
                const meta = STATUS_META[order.status] ?? { label: order.status, color: "#888", bg: "rgba(255,255,255,0.06)" };
                return (
                  <tr key={order.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 12, color: "var(--text2)" }}>{order.id}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg }}>{meta.label}</span>
                    </td>
                    <td style={{ padding: "11px 16px", textAlign: "right", fontWeight: 600 }}>${order.total?.toFixed(2)}</td>
                    <td style={{ padding: "11px 16px", color: "var(--text3)", fontSize: 12 }}>
                      {new Date(order.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td style={{ padding: "11px 16px", fontFamily: "monospace", fontSize: 11, color: "var(--text3)" }}>{order.awbNumber || "—"}</td>
                    <td style={{ padding: "11px 16px" }}>
                      <Link href={`/orders/${order.id}`} style={{ color: "var(--blue)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>View →</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 18, width: "100%", maxWidth: 440, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Edit Buyer</h2>
              <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {editError && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#f87171", marginBottom: 16 }}>
                {editError}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Name <span style={{ color: "var(--red)" }}>*</span></label>
                <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Company</label>
                <input style={inputStyle} placeholder="Business or organisation" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Country / Dial Code</label>
                  <input style={inputStyle} placeholder="e.g. Togo, +228, Ghana…" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>WhatsApp / Phone</label>
                  <input style={inputStyle} placeholder="+233 …" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Email <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span></label>
                <input style={inputStyle} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowEdit(false)} style={{
                flex: 1, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer", fontWeight: 500,
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                flex: 1, padding: "10px", background: "var(--text)", color: "var(--bg)",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: saving ? 0.5 : 1,
              }}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}