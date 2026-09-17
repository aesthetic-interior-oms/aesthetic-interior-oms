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

  // ── 1. Top Section: Logo (Left Side) & Company Contact Info (Right Side) ────
  let y = margin + 0.06

  // Left Side: Logo ONLY
  try {
    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })
    doc.addImage(logoImg, "PNG", margin + 0.08, y + 0.02, 1.5, 0.35)
  } catch {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(30, 41, 59)
    doc.text("AESTHETIC INTERIOR STUDIO", margin + 0.08, y + 0.18)
  }

  // Right Side: Company Details with Icons (One phone number per line, small font 4.5pt)
  const rightX = pageW - margin - 0.08
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.5)
  doc.setTextColor(30, 41, 59)
  doc.text("Aesthetic Interior Studio", rightX, y + 0.05, { align: "right" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(4.5)
  doc.setTextColor(71, 85, 105)
  
  // Phone numbers (one per line with phone icon symbol)
  doc.text("📞 01329694660", rightX, y + 0.11, { align: "right" })
  doc.text("01329694661", rightX, y + 0.16, { align: "right" })
  doc.text("01329694662", rightX, y + 0.21, { align: "right" })
  
  // Email with icon
  doc.text("✉️ aestheticinteriorstudio@gmail.com", rightX, y + 0.26, { align: "right" })
  
  // Address with icon
  doc.text("📍 3rd floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka", rightX, y + 0.31, { align: "right" })

  // Divider Line below Header
  y = margin + 0.46
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.006)
  doc.line(margin + 0.08, y, rightX, y)

  // ── 2. Sub-Header Row: Receipt No (Left), MONEY RECEIPT (Center), Date (Right) ─────
  y += 0.08

  // Left: Receipt No (decreased font size)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(5.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Receipt No: ${receiptNum}`, margin + 0.08, y + 0.1)

  // Center: MONEY RECEIPT title banner (Black background & White text)
  const titleW = 1.3
  const titleH = 0.16
  const titleX = pageW / 2 - titleW / 2
  doc.setFillColor(0, 0, 0) // Black background
  doc.roundedRect(titleX, y, titleW, titleH, 0.03, 0.03, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255) // White text
  doc.text("MONEY RECEIPT", pageW / 2, y + 0.11, { align: "center" })

  // Right: Date (decreased font size)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(5.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Date: ${dateFormatted}`, rightX, y + 0.1, { align: "right" })

  // ── 3. Row Spacing & Body Content Lines ───────────────────────────────────────
  y += 0.24 // Row gap after sub-header

  doc.setFontSize(6.5)
  doc.setTextColor(51, 65, 85)

  // Row 1: Received From (Client Name)
  doc.setFont("helvetica", "bold")
  doc.text("Received From:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.payerName || "—", margin + 1.1, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Row 2: Amount in Words (Immediately after Received From!)
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Amount in Words:", margin + 0.08, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  const wordsText = amountInWordsTaka(data.amount)
  doc.text(wordsText, margin + 1.1, y)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Row 3: Payment Method and its details
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)

  const methodUpper = (data.paymentMethod || "CASH").toUpperCase().replace(/_/g, " ")

  if (methodUpper.includes("CHECK") || methodUpper.includes("CHEQUE")) {
    // Cheque payment format: Check No., Bank, Date
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

  // Row 4: Purpose on Left, Contact No. on Right
  y += 0.14
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)

  // Left: Purpose for
  doc.text("Purpose / For:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.purpose || "Interior Decoration Services / Project Payment", margin + 0.95, y)

  // Right: Contact No.
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Contact No.:", margin + 3.8, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.payerPhone || "—", margin + 4.5, y)

  // ── 4. Amount Box (Bottom Left) & Signatures (Right) ─────────────────────
  y += 0.18

  // Amount Box (Bottom Left)
  doc.setFillColor(241, 245, 249)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.01)
  doc.roundedRect(margin + 0.08, y, 1.6, 0.22, 0.03, 0.03, "FD")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.5)
  doc.setTextColor(0, 0, 0)
  doc.text(`BDT  ${data.amount.toLocaleString("en-BD")}/-`, margin + 0.88, y + 0.14, { align: "center" })

  // Signatures
  const sigY = y + 0.18

  // Center-Right Signature: Received By
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.006)
  doc.line(margin + 2.2, sigY, margin + 3.5, sigY)
  doc.setFontSize(5.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Received By", margin + 2.85, sigY + 0.08, { align: "center" })

  // Right Signature: Authorized Signature
  doc.line(rightX - 1.4, sigY, rightX, sigY)
  doc.text("Authorized Signature", rightX - 0.7, sigY + 0.08, { align: "center" })

  // ── 5. Footer Bar (No fill background, Pure Black text with icons) ─────────
  const footerY = pageH - margin - 0.12

  // Pure Black Text with Icons for Social & Web Links
  doc.setFontSize(5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0) // Pure Black text
  doc.text(
    "🌐 aestheticinteriorbd.com   |   📸 aesthetic.interior.studio   |   📘 aestheticinteriorofficial",
    pageW / 2,
    footerY,
    { align: "center" }
  )

  // Save File
  const filename = `money-receipt-${receiptNum.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`
  doc.save(filename)
}
