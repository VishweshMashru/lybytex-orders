"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { use } from "react";

const STATUS_FLOW = ["draft", "confirmed", "in_production", "dispatched", "delivered", "paid"];
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

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [awb, setAwb] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [progress, setProgress] = useState(0);
  const [savingProgress, setSavingProgress] = useState(false);
  const [itemProgressMap, setItemProgressMap] = useState<Record<number, number>>({});
  const isAdmin = session?.user?.role === "admin";

  const fetchOrder = () =>
    fetch(`/api/orders/${id}`).then((r) => r.json()).then((d) => {
      setOrder(d);
      setAwb(d.awbNumber || "");
      setProgress(d.productionProgress ?? 0);
      // Build map of orderItemId -> completed
      const map: Record<number, number> = {};
      (d.progressData || []).forEach((p: any) => { map[p.orderItemId] = parseFloat(p.completed); });
      setItemProgressMap(map);
      setLoading(false);
    });

  useEffect(() => { fetchOrder(); }, [id]);

  const saveProgress = async (val: number) => {
    setSavingProgress(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productionProgress: val }),
    });
    setSavingProgress(false);
  };

  const updateItemProgress = async (orderItemId: number, newVal: number) => {
    const clamped = Math.max(0, newVal);
    setItemProgressMap((prev) => ({ ...prev, [orderItemId]: clamped }));
    await fetch(`/api/orders/${id}/progress`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderItemId, completed: clamped }),
    });
  };

  const advanceStatus = async () => {
    const currentIdx = STATUS_FLOW.indexOf(order.status);
    if (currentIdx >= STATUS_FLOW.length - 1) return;
    setUpdating(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: STATUS_FLOW[currentIdx + 1], awbNumber: awb || undefined, statusNote }),
    });
    await fetchOrder();
    setStatusNote("");
    setUpdating(false);
  };

  if (loading) return <div style={{ padding: 60, textAlign: "center", color: "var(--text3)" }}>Loading…</div>;
  if (!order || order.error) return <div style={{ padding: 60, textAlign: "center", color: "var(--red)" }}>Order not found.</div>;

  const currentIdx = STATUS_FLOW.indexOf(order.status);
  const meta = STATUS_META[order.status];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <Link href="/" style={{ color: "var(--text3)", textDecoration: "none", fontSize: 13 }}>← Back</Link>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: "monospace" }}>{order.id}</h1>
        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
      </div>

      {/* Progress stepper */}
      <div style={{ ...card, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {STATUS_FLOW.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            const m = STATUS_META[s];
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, transition: "all 0.2s",
                    background: done ? "var(--text)" : active ? m.bg : "var(--surface2)",
                    color: done ? "var(--bg)" : active ? m.color : "var(--text3)",
                    border: active ? `2px solid ${m.color}` : "2px solid transparent",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 9, color: active ? m.color : "var(--text3)", fontWeight: active ? 700 : 400, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                    {m.label}
                  </span>
                </div>
                {i < STATUS_FLOW.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: done ? "var(--text2)" : "var(--border)", margin: "0 4px", marginBottom: 18, borderRadius: 2 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Production progress bar */}
      {["confirmed", "in_production"].includes(order.status) && (
        <div style={{ ...card, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Production Progress</p>
            <span style={{ fontSize: 20, fontWeight: 800, color: progress === 100 ? "var(--green)" : "var(--text)" }}>{progress}%</span>
          </div>

          {/* Bar */}
          <div style={{ height: 8, background: "var(--surface2)", borderRadius: 99, overflow: "hidden", marginBottom: isAdmin ? 14 : 0 }}>
            <div style={{
              height: "100%", borderRadius: 99, transition: "width 0.3s ease",
              width: `${progress}%`,
              background: progress === 100 ? "var(--green)" : progress >= 50 ? "var(--blue)" : "var(--yellow)",
            }} />
          </div>

          {/* Admin slider + input */}
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="range" min={0} max={100} step={5} value={progress}
                onChange={(e) => setProgress(parseInt(e.target.value))}
                style={{ flex: 1, accentColor: "var(--blue)", cursor: "pointer" }}
              />
              <input
                type="number" min={0} max={100} value={progress}
                onChange={(e) => setProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{ width: 60, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "6px 10px", fontSize: 13, color: "var(--text)", outline: "none", textAlign: "center" }}
              />
              <button onClick={() => saveProgress(progress)} disabled={savingProgress} style={{
                padding: "7px 14px", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 8, fontSize: 12, color: "var(--text2)", cursor: "pointer", fontWeight: 500,
                opacity: savingProgress ? 0.5 : 1, whiteSpace: "nowrap",
              }}>
                {savingProgress ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Buyer + Order meta */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Buyer</p>
          <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{order.buyer?.name}</p>
          {order.buyer?.company && <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 2 }}>{order.buyer.company}</p>}
          <p style={{ fontSize: 12, color: "var(--text3)" }}>{order.buyer?.email}</p>
          {order.buyer?.country && <p style={{ fontSize: 12, color: "var(--text3)" }}>{order.buyer.country}</p>}
        </div>
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Order Info</p>
          {[
            ["Invoice", order.invoiceNumber],
            ["Currency", "USD"],
            ["Created", new Date(order.createdAt).toLocaleDateString("en-GB")],
            ...(order.awbNumber ? [["AWB", order.awbNumber]] : []),
            ...(order.shippingAddress ? [["Ship to", order.shippingAddress]] : []),
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text3)" }}>{k}</span>
              <span style={{ fontSize: 12, fontFamily: k === "Invoice" || k === "AWB" ? "monospace" : "inherit", color: "var(--text2)" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Line items */}
      <div style={{ ...card, marginBottom: 12, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", margin: 0 }}>Line Items</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Description", "Qty", "Unit Price", "Total", ...(isAdmin ? ["Done"] : [])].map((h, i) => (
                <th key={h} style={{ padding: "9px 20px", textAlign: i >= 2 && i !== 4 ? "right" : "left", fontSize: 11, color: "var(--text3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items?.map((item: any, i: number) => {
              const qty = parseFloat(item.quantity);
              const done = itemProgressMap[item.id] ?? 0;
              const pct = qty > 0 ? Math.min(100, (done / qty) * 100) : 0;
              return (
                <tr key={item.id} style={{ borderTop: i === 0 ? "none" : "1px solid var(--border)" }}>
                  <td style={{ padding: "11px 20px" }}>{item.description}</td>
                  <td style={{ padding: "11px 20px", color: "var(--text2)" }}>{item.quantity} {item.unit}</td>
                  <td style={{ padding: "11px 20px", textAlign: "right", color: "var(--text2)" }}>${parseFloat(item.unitPrice).toFixed(2)}</td>
                  <td style={{ padding: "11px 20px", textAlign: "right", fontWeight: 600 }}>${parseFloat(item.totalPrice).toFixed(2)}</td>
                  {isAdmin && (
                    <td style={{ padding: "8px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => updateItemProgress(item.id, done - 1)}
                          style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>−</button>
                        <input
                          type="number" min={0} value={done}
                          onChange={(e) => updateItemProgress(item.id, parseInt(e.target.value) || 0)}
                          style={{ width: 52, textAlign: "center", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 6, padding: "3px 6px", fontSize: 12, color: "var(--text)", outline: "none" }}
                        />
                        <span style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>/ {item.quantity}</span>
                        <button
                          onClick={() => updateItemProgress(item.id, done + 1)}
                          style={{ width: 24, height: 24, borderRadius: 6, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>+</button>
                        {/* mini bar */}
                        <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 99, overflow: "hidden", minWidth: 40 }}>
                          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: pct === 100 ? "var(--green)" : "var(--blue)", transition: "width 0.2s" }} />
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "1px solid var(--border2)", background: "var(--surface2)" }}>
              <td colSpan={isAdmin ? 4 : 3} style={{ padding: "12px 20px", textAlign: "right", fontWeight: 600, fontSize: 13, color: "var(--text2)" }}>Total</td>
              <td style={{ padding: "12px 20px", textAlign: "right", fontWeight: 800, fontSize: 16 }}>${order.total?.toFixed(2)} <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 400 }}>USD</span></td>
              {isAdmin && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Notes */}
      {order.notes && (
        <div style={{ ...card, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Notes</p>
          <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6 }}>{order.notes}</p>
        </div>
      )}

      {/* Admin: advance status */}
      {isAdmin && order.status !== "paid" && (
        <div style={{ ...card, marginBottom: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Update Status</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(order.status === "confirmed" || order.status === "in_production") && (
              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>AWB / Tracking Number</label>
                <input style={inputStyle} placeholder="Enter courier tracking number" value={awb} onChange={(e) => setAwb(e.target.value)} />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6 }}>Note (optional)</label>
              <input style={inputStyle}
                placeholder={`Note for moving to "${STATUS_META[STATUS_FLOW[currentIdx + 1]]?.label}"`}
                value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
            </div>
            <button onClick={advanceStatus} disabled={updating} style={{
              padding: "11px", background: "var(--text)", color: "var(--bg)",
              border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
              opacity: updating ? 0.5 : 1,
            }}>
              {updating ? "Updating…" : `Mark as ${STATUS_META[STATUS_FLOW[currentIdx + 1]]?.label} →`}
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button onClick={() => window.open(`/api/orders/${id}/invoice`, "_blank")} style={{
          flex: 1, padding: "11px", background: "var(--surface)", color: "var(--text)",
          border: "1px solid var(--border2)", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>
          📄 Download Invoice
        </button>
        {isAdmin && (
          <Link href={`/orders/${id}/edit`} style={{
            flex: 1, padding: "11px", background: "var(--surface)", color: "var(--text)",
            border: "1px solid var(--border2)", borderRadius: 10, fontSize: 13, fontWeight: 600,
            textDecoration: "none", textAlign: "center",
          }}>
            ✏️ Edit Order
          </Link>
        )}
      </div>

      {/* History */}
      {order.history?.length > 0 && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>History</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...order.history].reverse().map((h: any) => {
              const hm = STATUS_META[h.status];
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <span style={{ padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 700, color: hm.color, background: hm.bg, whiteSpace: "nowrap", marginTop: 1 }}>
                    {hm.label}
                  </span>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {new Date(h.changedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {h.note && <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>{h.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item change log */}
      {order.changeLogs?.length > 0 && (
        <div style={{ ...card, marginTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 14 }}>Item Changes</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[...order.changeLogs].reverse().map((log: any) => {
              let snapshot: any = null;
              try { snapshot = JSON.parse(log.snapshot); } catch {}
              return (
                <div key={log.id} style={{ borderLeft: "2px solid var(--border2)", paddingLeft: 14 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {new Date(log.changedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {log.reason && (
                    <p style={{ fontSize: 13, color: "var(--text2)", margin: "0 0 8px", fontStyle: "italic" }}>"{log.reason}"</p>
                  )}
                  {snapshot && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: "8px 12px" }}>
                        <p style={{ fontSize: 10, color: "#f87171", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>Before</p>
                        {snapshot.before?.map((item: any, i: number) => (
                          <p key={i} style={{ fontSize: 12, color: "var(--text2)", margin: "2px 0" }}>
                            {item.description} — {item.quantity} {item.unit} @ ${parseFloat(item.unitPrice).toFixed(2)}
                          </p>
                        ))}
                      </div>
                      <div style={{ background: "rgba(52,211,153,0.06)", borderRadius: 8, padding: "8px 12px" }}>
                        <p style={{ fontSize: 10, color: "#34d399", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px" }}>After</p>
                        {snapshot.after?.map((item: any, i: number) => (
                          <p key={i} style={{ fontSize: 12, color: "var(--text2)", margin: "2px 0" }}>
                            {item.description} — {item.quantity} {item.unit} @ ${parseFloat(item.unitPrice).toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}