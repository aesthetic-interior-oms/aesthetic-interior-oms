import { amountInWordsTaka } from "@/lib/number-to-words"

export type MoneyReceiptData = {
  receiptNo?: string | null
  serialNo?: number | null
  voucherNo?: string | null
  date: string | Date
  payerName: string
  payerPhone?: string | null
  payerAddress?: string | null
  paymentMethod?: string | null
  referenceNo?: string | null
  purpose?: string | null
  amount: number
}

/**
 * Generates a professional 6" x 2.75" (15.24 cm x 7 cm) Money Receipt PDF
 */
export async function downloadMoneyReceiptPDF(data: MoneyReceiptData) {
  const { default: jsPDF } = await import("jspdf")

  // 6 inches x 2.75 inches in landscape mode
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [2.75, 6.0],
  })

  const pageW = 6.0
  const pageH = 2.75
  const margin = 0.25

  // Date formatting
  const dateObj = data.date ? new Date(data.date) : new Date()
  const dateFormatted = dateObj.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  // Format Receipt Number
  const rawNum = data.receiptNo || data.voucherNo || (data.serialNo ? `VCH-${data.serialNo}` : `MR-${Date.now().toString().slice(-6)}`)
  const receiptNum = rawNum.startsWith("MR-") || rawNum.startsWith("VCH-") ? rawNum : `MR-${rawNum}`

  // ── Header Outer Border / Box ─────────────────────────────────────────────
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.015)
  doc.roundedRect(margin, margin, pageW - margin * 2, pageH - margin * 2, 0.08, 0.08, "S")

  // ── 1. Top Section: Logo (Left) & Company Info (Right) ─────────────────────
  let y = margin + 0.12

  // Try loading company header logo
  try {
    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })
    doc.addImage(logoImg, "PNG", margin + 0.1, y, 1.6, 0.35)
  } catch {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(30, 41, 59)
    doc.text("AESTHETIC INTERIOR", margin + 0.1, y + 0.2)
  }

  // Company Contact Details (Right side)
  const rightX = pageW - margin - 0.1
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(30, 41, 59)
  doc.text("Aesthetic Interior Studio", rightX, y + 0.06, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(5.5)
  doc.setTextColor(71, 85, 105)
  doc.text("Phone: 01329694660, 01329694661, 01329694662", rightX, y + 0.14, { align: "right" })
  doc.text("Email: aestheticinteriorstudio@gmail.com", rightX, y + 0.21, { align: "right" })
  doc.text("3rd floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka", rightX, y + 0.28, { align: "right" })

  // Divider Line
  y += 0.38
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.008)
  doc.line(margin + 0.1, y, pageW - margin - 0.1, y)

  // ── 2. Title & Receipt Metadata Bar ────────────────────────────────────────
  y += 0.08
  doc.setFillColor(30, 41, 59)
  doc.roundedRect(margin + 0.1, y, 1.3, 0.18, 0.03, 0.03, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  doc.text("MONEY RECEIPT", margin + 0.75, y + 0.12, { align: "center" })

  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Receipt No: ${receiptNum}`, pageW - margin - 1.6, y + 0.12)
  doc.text(`Date: ${dateFormatted}`, rightX, y + 0.12, { align: "right" })

  // ── 3. Receipt Details Table / Lines ───────────────────────────────────────
  y += 0.24

  doc.setFontSize(6.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(51, 65, 85)

  // Line 1: Received With Thanks From
  doc.setFont("helvetica", "bold")
  doc.text("Received From:", margin + 0.1, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  const nameText = data.payerName + (data.payerPhone ? ` (${data.payerPhone})` : "")
  doc.text(nameText, margin + 1.1, y)
  doc.setDrawColor(203, 213, 225)
  doc.line(margin + 1.1, y + 0.02, pageW - margin - 0.1, y + 0.02)

  // Line 2: Payment Method & Reference / Tx ID
  y += 0.16
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Payment Method:", margin + 0.1, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  const pMethod = (data.paymentMethod || "CASH").replace(/_/g, " ")
  doc.text(pMethod, margin + 1.1, y)

  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Ref / Tx ID:", pageW / 2 + 0.2, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  const refText = data.referenceNo || data.voucherNo || "—"
  doc.text(refText, pageW / 2 + 0.8, y)

  // Line 3: Purpose of Payment
  y += 0.16
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Payment For:", margin + 0.1, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  const purposeText = data.purpose || "Project Payment / Services Rendered"
  doc.text(purposeText, margin + 1.1, y)
  doc.line(margin + 1.1, y + 0.02, pageW - margin - 0.1, y + 0.02)

  // Line 4: Amount in Words
  y += 0.16
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Amount in Words:", margin + 0.1, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  const wordsText = amountInWordsTaka(data.amount)
  doc.text(wordsText, margin + 1.1, y)

  // ── 4. Amount Box & Signatures ─────────────────────────────────────────────
  y += 0.18

  // Amount Box (Bottom Left)
  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(15, 23, 42)
  doc.setLineWidth(0.012)
  doc.roundedRect(margin + 0.1, y, 1.8, 0.24, 0.03, 0.03, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(8)
  doc.setTextColor(15, 23, 42)
  doc.text(`BDT  ${data.amount.toLocaleString("en-BD")}/-`, margin + 1.0, y + 0.16, { align: "center" })

  // Signatures (Right)
  const sigY = y + 0.2

  // Left-center signature: Payer Signature
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.008)
  doc.line(margin + 2.3, sigY, margin + 3.6, sigY)
  doc.setFontSize(5.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Payer / Client Signature", margin + 2.95, sigY + 0.08, { align: "center" })

  // Right signature: Received By / Seal
  doc.line(pageW - margin - 1.5, sigY, pageW - margin - 0.1, sigY)
  doc.text("Received By (Authorized Seal & Sign)", pageW - margin - 0.8, sigY + 0.08, { align: "center" })

  // ── 5. Footer Line ────────────────────────────────────────────────────────
  const footerY = pageH - margin - 0.06
  doc.setFontSize(5.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text(
    "Website: aestheticinteriorbd.com  |  Instagram: aesthetic.interior.studio  |  Facebook: aestheticinteriorofficial",
    pageW / 2,
    footerY,
    { align: "center" }
  )

  // Save File
  const filename = `money-receipt-${receiptNum.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`
  doc.save(filename)
}
