"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Buyer { id: string; name: string; company?: string; email?: string; country?: string; phone?: string; createdAt: string; }

const inputStyle: React.CSSProperties = {
  background: "var(--surface2)", border: "1px solid var(--border2)",
  borderRadius: 8, padding: "9px 12px", fontSize: 13, color: "var(--text)", outline: "none", width: "100%",
};

export default function BuyersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === "admin";

  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin && session) { router.push("/"); return; }
    fetch("/api/buyers").then((r) => r.json()).then((d) => { setBuyers(Array.isArray(d) ? d : []); setLoading(false); });
  }, [isAdmin, session]);

  const q = search.toLowerCase().trim();
  const filteredBuyers = !q ? buyers : buyers.filter((b) =>
    b.name?.toLowerCase().includes(q) ||
    b.company?.toLowerCase().includes(q) ||
    b.email?.toLowerCase().includes(q) ||
    b.country?.toLowerCase().includes(q) ||
    b.phone?.toLowerCase().includes(q)
  );

  const resetModal = () => { setName(""); setCompany(""); setEmail(""); setCountry(""); setPhone(""); setError(""); };

  const handleAdd = async () => {
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");
    const res = await fetch("/api/buyers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, company, email, country, phone }),
    });
    if (res.ok) {
      const newBuyer = await res.json();
      setBuyers((prev) => [newBuyer, ...prev]);
      setShowModal(false); resetModal();
    } else {
      setError((await res.json()).error || "Failed to add buyer.");
    }
    setSaving(false);
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Buyers</h1>
          <p style={{ fontSize: 13, color: "var(--text3)", marginTop: 4 }}>{buyers.length} registered buyer{buyers.length !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          background: "var(--text)", color: "var(--bg)", padding: "8px 16px",
          borderRadius: 8, fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
        }}>+ Add Buyer</button>
      </div>

      <input
        type="text"
        placeholder="Search by name, company, country, phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%", background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "var(--text)",
          outline: "none", marginBottom: 20,
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--border2)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
      />
      {q && <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12, marginTop: -12 }}>{filteredBuyers.length} result{filteredBuyers.length !== 1 ? "s" : ""} for "{search}"</p>}

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 60 }}>Loading…</div>
      ) : buyers.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
          <p>No buyers yet. Add your first buyer to get started.</p>
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--text3)", padding: 60 }}>
          <p>No buyers matching "{search}".</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filteredBuyers.map((b) => (
            <Link key={b.id} href={`/buyers/${b.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: 20, cursor: "pointer", transition: "border-color 0.15s",
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border2)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "var(--text2)" }}>
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  {b.country && <span style={{ fontSize: 11, background: "var(--surface2)", color: "var(--text3)", padding: "3px 8px", borderRadius: 20 }}>{b.country}</span>}
                </div>
                <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{b.name}</p>
                {b.company && <p style={{ fontSize: 12, color: "var(--text2)", marginBottom: 2 }}>{b.company}</p>}
                {b.email && <p style={{ fontSize: 12, color: "var(--text3)" }}>{b.email}</p>}
                {b.phone && <p style={{ fontSize: 12, color: "var(--text3)" }}>{b.phone}</p>}
                {!b.email && !b.phone && <p style={{ fontSize: 11, color: "var(--text3)", opacity: 0.5 }}>No contact info</p>}
                <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 12, opacity: 0.5 }}>
                  Added {new Date(b.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Add Buyer Modal */}
      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 18, width: "100%", maxWidth: 440, padding: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Add Buyer</h2>
              <button onClick={() => { setShowModal(false); resetModal(); }} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            {error && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "9px 12px", fontSize: 12, color: "#f87171", marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>
                  Name <span style={{ color: "var(--red)" }}>*</span>
                </label>
                <input style={inputStyle} placeholder="e.g. Kwame Asante" value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Company</label>
                <input style={inputStyle} placeholder="Business or organisation" value={company} onChange={(e) => setCompany(e.target.value)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Country / Dial Code</label>
                  <input style={inputStyle} placeholder="e.g. Togo, +228, Ghana…" value={country} onChange={(e) => setCountry(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>WhatsApp / Phone</label>
                  <input style={inputStyle} placeholder="+233 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text2)", display: "block", marginBottom: 6, fontWeight: 500 }}>Email <span style={{ color: "var(--text3)", fontWeight: 400 }}>(optional)</span></label>
                <input style={inputStyle} type="email" placeholder="buyer@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
              <button onClick={() => { setShowModal(false); resetModal(); }} style={{
                flex: 1, padding: "10px", background: "var(--surface2)", border: "1px solid var(--border2)",
                borderRadius: 10, fontSize: 13, color: "var(--text2)", cursor: "pointer", fontWeight: 500,
              }}>Cancel</button>
              <button onClick={handleAdd} disabled={saving} style={{
                flex: 1, padding: "10px", background: "var(--text)", color: "var(--bg)",
                border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer",
                opacity: saving ? 0.5 : 1,
              }}>{saving ? "Adding…" : "Add Buyer"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}