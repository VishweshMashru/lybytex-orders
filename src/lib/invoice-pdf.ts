import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export interface InvoiceData {
  orderId: string;
  invoiceNumber: string;
  date: string;
  buyer: {
    name: string;
    company?: string | null;
    email?: string | null;
    country?: string | null;
  };
  items: {
    description: string;
    quantity: string;
    unit: string;
    unitPrice: string;
    totalPrice: string;
  }[];
  subtotal: number;
  notes?: string | null;
  shippingAddress?: string | null;
}

export async function generateInvoicePDF(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  const BLACK = rgb(0.05, 0.05, 0.05);
  const GRAY = rgb(0.45, 0.45, 0.45);
  const ACCENT = rgb(0.05, 0.05, 0.05);
  const LIGHT = rgb(0.95, 0.95, 0.95);

  const L = 50; // left margin
  const R = width - 50; // right edge
  let y = height - 50;

  // ── Header bar ────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.05, 0.05, 0.05) });

  page.drawText("LYBYTEX", { x: L, y: height - 55, size: 28, font: bold, color: rgb(1, 1, 1) });
  page.drawText("India", { x: L + 125, y: height - 57, size: 14, font: regular, color: rgb(0.7, 0.7, 0.7) });
  page.drawText("Surat, Gujarat, India  |  lybytex.com", {
    x: L, y: height - 78, size: 9, font: regular, color: rgb(0.6, 0.6, 0.6),
  });

  // INVOICE label right side
  page.drawText("COMMERCIAL INVOICE", {
    x: R - 165, y: height - 48, size: 15, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText(`# ${data.invoiceNumber}`, {
    x: R - 165, y: height - 65, size: 10, font: regular, color: rgb(0.7, 0.7, 0.7),
  });
  page.drawText(`Date: ${data.date}`, {
    x: R - 165, y: height - 80, size: 9, font: regular, color: rgb(0.6, 0.6, 0.6),
  });

  y = height - 110;

  // ── Bill To / Order info ──────────────────────────────────────
  page.drawText("BILL TO", { x: L, y, size: 9, font: bold, color: GRAY });
  page.drawText("ORDER", { x: 320, y, size: 9, font: bold, color: GRAY });
  y -= 16;

  page.drawText(data.buyer.name, { x: L, y, size: 11, font: bold, color: BLACK });
  page.drawText(data.orderId, { x: 320, y, size: 11, font: bold, color: BLACK });
  y -= 15;

  if (data.buyer.company) {
    page.drawText(data.buyer.company, { x: L, y, size: 10, font: regular, color: BLACK });
    y -= 14;
  }
  if (data.buyer.email) {
    page.drawText(data.buyer.email, { x: L, y, size: 9, font: regular, color: GRAY });
  }
  page.drawText(`Currency: USD`, { x: 320, y, size: 9, font: regular, color: GRAY });
  y -= 13;

  if (data.buyer.country) {
    page.drawText(data.buyer.country, { x: L, y, size: 9, font: regular, color: GRAY });
  }
  if (data.shippingAddress) {
    page.drawText(`Ship to: ${data.shippingAddress}`, { x: 320, y, size: 9, font: regular, color: GRAY });
  }

  y -= 30;

  // ── Line items table header ───────────────────────────────────
  page.drawRectangle({ x: L, y: y - 4, width: R - L, height: 22, color: LIGHT });
  const cols = { desc: L + 8, qty: 310, unit: 360, unitP: 410, total: 490 };

  page.drawText("DESCRIPTION", { x: cols.desc, y: y + 4, size: 8, font: bold, color: GRAY });
  page.drawText("QTY", { x: cols.qty, y: y + 4, size: 8, font: bold, color: GRAY });
  page.drawText("UNIT", { x: cols.unit, y: y + 4, size: 8, font: bold, color: GRAY });
  page.drawText("UNIT PRICE", { x: cols.unitP, y: y + 4, size: 8, font: bold, color: GRAY });
  page.drawText("TOTAL", { x: cols.total, y: y + 4, size: 8, font: bold, color: GRAY });
  y -= 22;

  // ── Line items ────────────────────────────────────────────────
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i];
    if (i % 2 === 0) {
      page.drawRectangle({ x: L, y: y - 4, width: R - L, height: 20, color: rgb(0.99, 0.99, 0.99) });
    }
    // wrap long descriptions
    const descWords = item.description;
    page.drawText(descWords.length > 45 ? descWords.slice(0, 45) + "…" : descWords, {
      x: cols.desc, y: y + 3, size: 9, font: regular, color: BLACK,
    });
    page.drawText(item.quantity, { x: cols.qty, y: y + 3, size: 9, font: regular, color: BLACK });
    page.drawText(item.unit, { x: cols.unit, y: y + 3, size: 9, font: regular, color: BLACK });
    page.drawText(`$${parseFloat(item.unitPrice).toFixed(2)}`, { x: cols.unitP, y: y + 3, size: 9, font: regular, color: BLACK });
    page.drawText(`$${parseFloat(item.totalPrice).toFixed(2)}`, { x: cols.total, y: y + 3, size: 9, font: bold, color: BLACK });
    y -= 20;
  }

  // ── Totals ────────────────────────────────────────────────────
  y -= 10;
  page.drawLine({ start: { x: 380, y }, end: { x: R, y }, thickness: 0.5, color: GRAY });
  y -= 16;
  page.drawText("SUBTOTAL", { x: 380, y, size: 9, font: regular, color: GRAY });
  page.drawText(`USD $${data.subtotal.toFixed(2)}`, { x: cols.total, y, size: 9, font: regular, color: BLACK });
  y -= 14;
  page.drawRectangle({ x: 370, y: y - 4, width: R - 370, height: 20, color: ACCENT });
  page.drawText("TOTAL DUE", { x: 380, y: y + 3, size: 10, font: bold, color: rgb(1, 1, 1) });
  page.drawText(`USD $${data.subtotal.toFixed(2)}`, { x: cols.total, y: y + 3, size: 10, font: bold, color: rgb(1, 1, 1) });
  y -= 30;

  // ── Notes ─────────────────────────────────────────────────────
  if (data.notes) {
    page.drawText("Notes:", { x: L, y, size: 9, font: bold, color: GRAY });
    y -= 14;
    page.drawText(data.notes.slice(0, 120), { x: L, y, size: 9, font: regular, color: BLACK });
    y -= 20;
  }

  // ── Footer ────────────────────────────────────────────────────
  page.drawLine({ start: { x: L, y: 60 }, end: { x: R, y: 60 }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
  page.drawText("Thank you for your business. Payment terms: as agreed. Goods remain property of LybyTex until full payment received.", {
    x: L, y: 45, size: 7.5, font: regular, color: GRAY,
  });
  page.drawText("LybyTex India  |  Surat, Gujarat, India  |  lybytex.com", {
    x: L, y: 32, size: 7.5, font: regular, color: GRAY,
  });

  return doc.save();
}