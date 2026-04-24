"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LineItem { description: string; quantity: string; unit: string; unitPrice: string; }

const inputStyle: React.CSSProperties = {
  background: "var(--surface2)", border: "1px solid var(--border2)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: "100%",
};
const card: React.CSSProperties = {
  background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 20, marginBottom: 16,
};

export default function EditOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  // Reason modal
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetch(`/api/orders/${id}`).then((r) => r.json()).then((data) => {
      setOrder(data);
      setNotes(data.notes || "");
      setShippingAddress(data.shippingAddress || "");
      setItems(
        data.items?.map((i: any) => ({
          description: i.description, quantity: i.quantity,
          unit: i.unit, unitPrice: i.unitPrice,
        })) ?? [{ description: "", quantity: "", unit: "metres", unitPrice: "" }]
      );
      setLoading(false);
    });
  }, [id]);

  const total = items.reduce((sum, i) => {
    const t = parseFloat(i.quantity || "0") * parseFloat(i.unitPrice || "0");
    return sum + (isNaN(t) ? 0 : t);
  }, 0);

  const addItem = () => setItems([...items, { description: "", quantity: "", unit: "metres", unitPrice: "" }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof LineItem, value: string) =>
    setItems(items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));

  const handleSaveClick = () => {
    if (items.some((i) => !i.description || !i.quantity || !i.unitPrice)) {
      setError("Please fill in all line item fields."); return;
    }
    setError("");
    setReason("");
    setShowReasonModal(true);
  };

  const confirmSave = async () => {
    setSaving(true);
    setShowReasonModal(false);

    await fetch(`/api/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, shippingAddress }),
    });

    const res = await fetch(`/api/orders/${id}/items`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, reason: reason.trim() || undefined }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error || "Failed to save");
      setSaving(false);
      return;
    }

    router.push(`/orders/${id}`);
  };

  const handleDelete = async () => {
    if (!confirm(`Delete order ${id}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/orders/${id}/delete`, { method: "DELETE" });
    if (res.ok) { router.push("/"); }
    else { setError((await res.json()).error || "Failed to delete"); setDeleting(false); }
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--text3)" }}>Loading…</div>;
  if (!order || order.error) return <div style={{ padding: 60, textAlign: "center", color: "var(--red)" }}>Order not found.</div>;

  const isEditable = order.status === "draft" || order.status === "confirmed" || order.status === "in_production";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link href={`/orders/${id}`} style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>← Back</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Edit {id}</h1>
        {!isEditable && (
          <span style={{ fontSize: 11, background: "rgba(251,191,36,0.15)", color: "#fbbf24", padding: "3px 10px", borderRadius: 20 }}>
            Read-only — {order.status}
          </span>
        )}
      </div>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "10px 14px", fontSize: 13, color: "#f87171", marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* Buyer (read-only) */}
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Buyer</p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--text2)" }}>
            {order.buyer?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, margin: 0 }}>{order.buyer?.name}</p>
            <p style={{ fontSize: 12, color: "var(--text3)", margin: "2px 0 0" }}>{order.buyer?.email} · {order.buyer?.country}</p>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Line Items</p>
          {isEditable && <button onClick={addItem} style={{ fontSize: 12, color: "var(--blue)", background: "none", border: "none", cursor: "pointer", fontWeight: 500 }}>+ Add item</button>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "3fr 80px 100px 90px 28px", gap: 6, marginBottom: 8 }}>
          {["Description", "Qty", "Unit", "$/unit", ""].map((h) => (
            <span key={h} style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{h}</span>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "3fr 80px 100px 90px 28px", gap: 6, alignItems: "center" }}>
              <input disabled={!isEditable} style={{ ...inputStyle, opacity: isEditable ? 1 : 0.5 }} placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
              <input disabled={!isEditable} style={{ ...inputStyle, opacity: isEditable ? 1 : 0.5 }} type="number" placeholder="100" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
              <select disabled={!isEditable} style={{ ...inputStyle, cursor: isEditable ? "pointer" : "default", opacity: isEditable ? 1 : 0.5 }} value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}>
                <option value="metres">metres</option>
                <option value="pieces">pieces</option>
                <option value="kg">kg</option>
                <option value="yards">yards</option>
                <option value="dozen">dozen</option>
              </select>
              <input disabled={!isEditable} style={{ ...inputStyle, opacity: isEditable ? 1 : 0.5 }} type="number" placeholder="4.50" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", e.target.value)} />
              {isEditable && (
                <button onClick={() => removeItem(idx)} disabled={items.length === 1} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 18, cursor: "pointer", opacity: items.length === 1 ? 0.2 : 1, padding: 0 }}>×</button>
              )}
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
      <div style={card}>
        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Details</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Shipping Address</label>
            <input disabled={!isEditable} style={{ ...inputStyle, opacity: isEditable ? 1 : 0.5 }} placeholder="Delivery address" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Notes</label>
            <textarea disabled={!isEditable} style={{ ...inputStyle, resize: "vertical", minHeight: 80, opacity: isEditable ? 1 : 0.5 }} placeholder="Payment terms, special instructions…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      {isEditable && (
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSaveClick} disabled={saving} style={{
            flex: 1, padding: "13px", background: "var(--text)", color: "var(--bg)",
            border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.5 : 1,
          }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          {order.status === "draft" && (
            <button onClick={handleDelete} disabled={deleting} style={{
              padding: "13px 20px", borderRadius: 12, fontWeight: 600, fontSize: 13,
              border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", background: "transparent", cursor: "pointer",
              opacity: deleting ? 0.5 : 1,
            }}>
              {deleting ? "Deleting…" : "Delete"}
            </button>
          )}
        </div>
      )}

      {/* Reason modal */}
      {showReasonModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 18, width: "100%", maxWidth: 420, padding: 28 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>Why are you changing this order?</h2>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 20 }}>This will be logged in the order's change history.</p>
            <textarea
              autoFocus
              placeholder="e.g. Buyer requested 50 more metres of gold fabric"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "var(--text)",
                outline: "none", resize: "vertical", minHeight: 90,
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowReasonModal(false)} style={{
                flex: 1, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer", fontWeight: 500,
              }}>Cancel</button>
              <button onClick={confirmSave} style={{
                flex: 1, padding: "10px", background: "var(--text)", color: "var(--bg)",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>
                {reason.trim() ? "Save with reason" : "Save without reason"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}