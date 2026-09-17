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
  bankName?: string | null
  chequeNo?: string | null
  chequeDate?: string | Date | null
  purpose?: string | null
  amount: number
}

/**
 * Generates a professional 6" x 2.75" (15.24 cm x 7 cm) Money Receipt PDF
 */
export async function downloadMoneyReceiptPDF(data: MoneyReceiptData) {
  const { default: jsPDF } = await import("jspdf")

  // 6.0 inches x 2.75 inches in landscape mode
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "in",
    format: [2.75, 6.0],
  })

  const pageW = 6.0
  const pageH = 2.75
  const margin = 0.18
  const contentW = pageW - margin * 2

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

  // ── Outer Border ─────────────────────────────────────────────────────────
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.012)
  doc.roundedRect(margin, margin, contentW, pageH - margin * 2, 0.05, 0.05, "S")

  // ── 1. Top Section: Logo & Phone (Left), Contact & Address (Right) ─────────
  let y = margin + 0.06

  // Left Column: Logo + Phone Numbers (1 per line)
  try {
    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })
    doc.addImage(logoImg, "PNG", margin + 0.08, y, 1.3, 0.28)
  } catch {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(8.5)
    doc.setTextColor(30, 41, 59)
    doc.text("AESTHETIC INTERIOR STUDIO", margin + 0.08, y + 0.12)
  }

  // Left Side Phone Numbers
  doc.setFont("helvetica", "normal")
  doc.setFontSize(4.5)
  doc.setTextColor(71, 85, 105)
  doc.text("Ph: 01329694660", margin + 0.08, y + 0.32)
  doc.text("     01329694661", margin + 0.08, y + 0.37)
  doc.text("     01329694662", margin + 0.08, y + 0.42)

  // Right Side: Company Details
  const rightX = pageW - margin - 0.08
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.5)
  doc.setTextColor(30, 41, 59)
  doc.text("Aesthetic Interior Studio", rightX, y + 0.08, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(4.5)
  doc.setTextColor(71, 85, 105)
  doc.text("Email: aestheticinteriorstudio@gmail.com", rightX, y + 0.15, { align: "right" })
  doc.text("3rd floor, 183 East Senpara Parbata,", rightX, y + 0.21, { align: "right" })
  doc.text("Begum Rokeya Sarani, Mirpur 10, Dhaka", rightX, y + 0.27, { align: "right" })

  // Divider Line below Header
  y = margin + 0.48
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.006)
  doc.line(margin + 0.08, y, rightX, y)

  // ── 2. Sub-Header Row: Receipt No (Left), MONEY RECEIPT (Center), Date (Right) ─────
  y += 0.12
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.5)
  doc.setTextColor(30, 41, 59)

  // Left: Receipt No
  doc.text(`Receipt No: ${receiptNum}`, margin + 0.08, y)

  // Center: MONEY RECEIPT title
  doc.setFontSize(8)
  doc.text("MONEY RECEIPT", pageW / 2, y, { align: "center" })

  // Right: Date
  doc.setFontSize(6.5)
  doc.text(`Date: ${dateFormatted}`, rightX, y + 0.01, { align: "right" })

  // ── 3. Row Gap & Body Content Lines ───────────────────────────────────────
  y += 0.18 // Row gap

  doc.setFontSize(6.5)
  doc.setTextColor(51, 65, 85)

  // Line 1: Received From
  doc.setFont("helvetica", "bold")
  doc.text("Received From:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.payerName || "—", margin + 1.1, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Line 2: Contact No.
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Contact No.:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.payerPhone || "—", margin + 1.1, y)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Line 3: Amount in Words (Immediately after Received From & Contact No)
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Amount in Words:", margin + 0.08, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  const wordsText = amountInWordsTaka(data.amount)
  doc.text(wordsText, margin + 1.1, y)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Line 4: Dynamic Payment Method Details
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)

  const methodUpper = (data.paymentMethod || "CASH").toUpperCase().replace(/_/g, " ")

  if (methodUpper.includes("CHECK") || methodUpper.includes("CHEQUE")) {
    // Cheque payment format: Check No, Bank, Date
    doc.text("Payment Method:", margin + 0.08, y)
    doc.setFont("helvetica", "normal")
    doc.text("Cheque", margin + 1.0, y)

    doc.setFont("helvetica", "bold")
    doc.text("Check No.:", margin + 1.7, y)
    doc.setFont("helvetica", "normal")
    doc.text(data.chequeNo || data.referenceNo || "—", margin + 2.3, y)

    doc.setFont("helvetica", "bold")
    doc.text("Bank:", margin + 3.2, y)
    doc.setFont("helvetica", "normal")
    doc.text(data.bankName || "—", margin + 3.6, y)

    if (data.chequeDate) {
      doc.setFont("helvetica", "bold")
      doc.text("Date:", margin + 4.7, y)
      doc.setFont("helvetica", "normal")
      const cDate = new Date(data.chequeDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      doc.text(cDate, margin + 5.1, y)
    }
  } else if (methodUpper.includes("BANK") || methodUpper.includes("TRANSFER")) {
    // Bank Transfer format: Ref / Tx ID, Bank
    doc.text("Payment Method:", margin + 0.08, y)
    doc.setFont("helvetica", "normal")
    doc.text("Bank Transfer", margin + 1.0, y)

    doc.setFont("helvetica", "bold")
    doc.text("Ref / Tx ID:", margin + 2.0, y)
    doc.setFont("helvetica", "normal")
    doc.text(data.referenceNo || data.voucherNo || "—", margin + 2.7, y)

    doc.setFont("helvetica", "bold")
    doc.text("Bank:", margin + 4.0, y)
    doc.setFont("helvetica", "normal")
    doc.text(data.bankName || "—", margin + 4.4, y)
  } else {
    // Cash / Mobile Banking format: Ref / Tx ID
    doc.text("Payment Method:", margin + 0.08, y)
    doc.setFont("helvetica", "normal")
    doc.text(methodUpper.includes("MOBILE") ? "Mobile Banking" : "Cash", margin + 1.0, y)

    doc.setFont("helvetica", "bold")
    doc.text("Ref / Tx ID:", margin + 2.3, y)
    doc.setFont("helvetica", "normal")
    doc.text(data.referenceNo || data.voucherNo || "—", margin + 3.0, y)
  }

  // Line 5: Purpose of Payment
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Purpose / For:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.purpose || "Interior Decoration Services / Project Payment", margin + 1.0, y)
  doc.line(margin + 1.0, y + 0.02, rightX, y + 0.02)

  // ── 4. Amount Box (Bottom Left) & Signatures (Right) ─────────────────────
  y += 0.18

  // Amount Box (Bottom Left)
  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.01)
  doc.roundedRect(margin + 0.08, y, 1.6, 0.22, 0.03, 0.03, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(15, 23, 42)
  doc.text(`BDT  ${data.amount.toLocaleString("en-BD")}/-`, margin + 0.88, y + 0.14, { align: "center" })

  // Signatures
  const sigY = y + 0.18

  // Center-Right: Payer Signature
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.006)
  doc.line(margin + 2.2, sigY, margin + 3.5, sigY)
  doc.setFontSize(5.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Payer / Client Signature", margin + 2.85, sigY + 0.08, { align: "center" })

  // Right: Received By (Authorized Signature / Seal)
  doc.line(rightX - 1.4, sigY, rightX, sigY)
  doc.text("Received By (Authorized Seal & Sign)", rightX - 0.7, sigY + 0.08, { align: "center" })

  // ── 5. Olive Footer Bar (Full Width at Bottom) ───────────────────────────
  const footerH = 0.18
  const footerY = pageH - margin - footerH

  // Olive Background Fill
  doc.setFillColor(85, 107, 47) // Olive color (#556B2F)
  doc.roundedRect(margin, footerY, contentW, footerH, 0.03, 0.03, "F")

  // White Footer Text with Social Links
  doc.setFontSize(5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(255, 255, 255)
  doc.text(
    "Website: aestheticinteriorbd.com   |   Instagram: aesthetic.interior.studio   |   Facebook: aestheticinteriorofficial",
    pageW / 2,
    footerY + 0.11,
    { align: "center" }
  )

  // Save File
  const filename = `money-receipt-${receiptNum.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`
  doc.save(filename)
}
