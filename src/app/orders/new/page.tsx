"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface LineItem { description: string; quantity: string; unit: string; unitPrice: string; }

const inputStyle: React.CSSProperties = {
  background: "var(--surface2)", border: "1px solid var(--border2)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)",
  outline: "none", width: "100%",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: 14, padding: 20, marginBottom: 16,
};

function NewOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [buyers, setBuyers] = useState<any[]>([]);
  const [buyerId, setBuyerId] = useState(searchParams.get("buyerId") || "");
  const [notes, setNotes] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "", unit: "metres", unitPrice: "" }]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/buyers").then((r) => r.json()).then(setBuyers);
  }, []);

  const total = items.reduce((sum, i) => {
    const t = parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0");
    return sum + (isNaN(t) ? 0 : t);
  }, 0);

  const addItem = () => setItems([...items, { description: "", quantity: "", unit: "metres", unitPrice: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string) =>
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item));

  const handleSubmit = async () => {
    if (!buyerId || items.some((i) => !i.description || !i.quantity || !i.unitPrice)) {
      alert("Please fill in all required fields."); return;
    }
    setSubmitting(true);
    const res = await fetch("/api/orders", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId, notes, shippingAddress, items }),
    });
    const data = await res.json();
    router.push(`/orders/${data.id}`);
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link href="/" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>← Back</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>New Order</h1>
      </div>

      {/* Buyer */}
      <div style={cardStyle}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Buyer</p>
        <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)}
          style={{ ...inputStyle, cursor: "pointer" }}>
          <option value="">Select buyer…</option>
          {buyers.map((b) => (
            <option key={b.id} value={b.id}>{b.name}{b.company ? ` — ${b.company}` : ""}{b.country ? ` (${b.country})` : ""}</option>
          ))}
        </select>
      </div>

      {/* Line items */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Line Items</p>
          <button onClick={addItem} style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>+ Add item</button>
        </div>

        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: "3fr 80px 100px 90px 28px", gap: 8, marginBottom: 6 }}>
          {["Description", "Qty", "Unit", "$/unit", ""].map((h) => (
            <span key={h} style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "3fr 80px 100px 90px 28px", gap: 8, alignItems: "center" }}>
              <input style={inputStyle} placeholder="e.g. Kente fabric — Gold on Black" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
              <input style={inputStyle} type="number" placeholder="100" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <select style={{ ...inputStyle, cursor: "pointer" }} value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}>
                <option value="metres">metres</option>
                <option value="pieces">pieces</option>
                <option value="kg">kg</option>
                <option value="yards">yards</option>
                <option value="dozen">dozen</option>
              </select>
              <input style={inputStyle} type="number" placeholder="4.50" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
              <button onClick={() => removeItem(idx)} disabled={items.length === 1}
                style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 18, cursor: "pointer", opacity: items.length === 1 ? 0.2 : 1, padding: 0, lineHeight: 1 }}>×</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>${total.toFixed(2)}</span>
          <span style={{ fontSize: 12, color: "var(--text3)" }}>USD</span>
        </div>
      </div>

      {/* Details */}
      <div style={cardStyle}>
        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Details</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Shipping Address</label>
            <input style={inputStyle} placeholder="Delivery address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Notes</label>
            <textarea style={{ ...inputStyle, resize: "vertical", minHeight: 80 }} placeholder="Payment terms, special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{
        width: "100%", padding: "13px", background: "var(--text)", color: "var(--bg)",
        border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer",
        opacity: submitting ? 0.5 : 1, transition: "opacity 0.15s",
      }}>
        {submitting ? "Creating…" : "Create Order"}
      </button>
    </div>
  );
}

export default function NewOrderPage() {
  return <Suspense><NewOrderForm /></Suspense>;
}