import { amountInWordsTaka } from "@/lib/number-to-words"
import { loadPdfIcons } from "@/lib/pdf-icons"

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
  const icons = await loadPdfIcons()

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

  // ── Background Watermark Logo ──────────────────────────────────────────────
  try {
    const watermarkImg = new Image()
    watermarkImg.src = "/android-chrome-512x512.png"
    await new Promise((resolve) => {
      watermarkImg.onload = resolve
      watermarkImg.onerror = resolve
    })

    if ((doc as any).GState) {
      doc.setGState(new (doc as any).GState({ opacity: 0.07 }))
    }
    const wmSize = 1.6
    const wmX = (pageW - wmSize) / 2
    const wmY = (pageH - wmSize) / 2
    doc.addImage(watermarkImg, "PNG", wmX, wmY, wmSize, wmSize)

    if ((doc as any).GState) {
      doc.setGState(new (doc as any).GState({ opacity: 1.0 }))
    }
  } catch (err) {
    console.warn("Watermark image load failed:", err)
  }

  // ── 1. Top Section: Logo (Left Side) & Company Contact Info (Right Side) ────
  let y = margin + 0.04

  // Left Side: HeaderLogo.png ONLY (Maintaining Exact Real Aspect Ratio)
  try {
    const logoImg = new Image()
    logoImg.src = "/Logo/HeaderLogo.png"
    await new Promise((resolve) => {
      logoImg.onload = resolve
      logoImg.onerror = resolve
    })

    const nw = logoImg.naturalWidth || logoImg.width || 300
    const nh = logoImg.naturalHeight || logoImg.height || 100
    const aspect = nw / nh
    const maxH = 0.38
    const maxW = 1.6
    let logoW = maxH * aspect
    let logoH = maxH
    if (logoW > maxW) {
      logoW = maxW
      logoH = logoW / aspect
    }

    doc.addImage(logoImg, "PNG", margin + 0.08, y + 0.01, logoW, logoH)
  } catch {
    // Left Side: HeaderLogo.png ONLY (no fallback text)
  }

  // Right Side: Company Details Block (Uniform left alignment, Email line width)
  const rightX = pageW - margin - 0.08
  doc.setFont("helvetica", "normal")
  doc.setFontSize(4.5)
  doc.setTextColor(71, 85, 105)

  const emailStr = "aestheticinteriorstudio@gmail.com"
  const emailTextW = doc.getTextWidth(emailStr)

  // Black Circle Badge dimensions
  const badgeDiameter = 0.075
  const badgeRadius = badgeDiameter / 2
  const iconDim = 0.045
  const badgeGap = 0.03

  // Section Width equals total Email line width (badge + gap + emailTextW)
  const sectionW = badgeDiameter + badgeGap + emailTextW
  const startX = rightX - sectionW
  const textX = startX + badgeDiameter + badgeGap
  const badgeCenterX = startX + badgeRadius

  let curY = y + 0.03

  // Helper to draw black circle badge with white icon inside
  const drawBadgeIcon = (iconPng: string, centerY: number) => {
    doc.setFillColor(0, 0, 0)
    doc.circle(badgeCenterX, centerY, badgeRadius, "F")
    if (iconPng) {
      doc.addImage(iconPng, "PNG", badgeCenterX - iconDim / 2, centerY - iconDim / 2, iconDim, iconDim)
    }
  }

  // 1. Phone numbers — 3 separate lines, badge centered across all 3
  const phoneLines = ["01329694660", "01329694661", "01329694662"]
  const phoneLineH = 0.05
  const phoneTotalH = (phoneLines.length - 1) * phoneLineH
  const phoneBadgeCenterY = curY - 0.015 + phoneTotalH / 2
  drawBadgeIcon(icons.whitePhone, phoneBadgeCenterY)
  phoneLines.forEach((num, i) => {
    doc.text(num, textX, curY + i * phoneLineH)
  })

  // 2. Email row (advance past all 3 phone lines + gap)
  curY += phoneTotalH + 0.07
  drawBadgeIcon(icons.whiteEmail, curY - 0.015)
  doc.text(emailStr, textX, curY)

  // 3. Address row (Wrapped into 2 lines, icon badge centered vertically across lines)
  curY += 0.07
  const addressStr = "3rd floor, 183 East Senpara Parbata, Begum Rokeya Sarani, Mirpur 10, Dhaka"
  const splitAddress = doc.splitTextToSize(addressStr, emailTextW)
  const lineHeight = 0.05
  const totalTextH = (splitAddress.length - 1) * lineHeight
  const addrBadgeCenterY = curY - 0.015 + totalTextH / 2

  drawBadgeIcon(icons.whiteLocation, addrBadgeCenterY)
  doc.text(splitAddress, textX, curY)

  // Divider Line below Header removed
  y = Math.max(margin + 0.46, curY + totalTextH + 0.04)

  // ── 2. Sub-Header Row: Receipt No (Left), MONEY RECEIPT (Center), Date (Right) ─────
  y += 0.12

  // Left: Receipt No (decreased font size)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(5.5)
  doc.setTextColor(30, 41, 59)
  doc.text(`Receipt No: ${receiptNum}`, margin + 0.08, y + 0.11)

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
  doc.text(`Date: ${dateFormatted}`, rightX, y + 0.11, { align: "right" })

  // ── 3. Row Spacing & Body Content Lines (Generous Vertical Spacing) ─────────────
  y += 0.30 // Gap after sub-header row

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

  // Row 2: Amount in Words (Generous 0.18" gap)
  y += 0.18
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Amount in Words:", margin + 0.08, y)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(15, 23, 42)
  const wordsText = amountInWordsTaka(data.amount)
  doc.text(wordsText, margin + 1.1, y)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Row 3: Payment Method and its details (Generous 0.18" gap)
  y += 0.18
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

  // Row 3 Horizontal Line
  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 1.1, y + 0.02, rightX, y + 0.02)

  // Row 4: Purpose on Left, Contact No. on Right (Generous 0.18" gap)
  y += 0.18
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)

  // Left: Purpose for
  doc.text("Purpose / For:", margin + 0.08, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.purpose || "Interior Decoration Services / Project Payment", margin + 0.95, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 0.95, y + 0.02, margin + 3.65, y + 0.02)

  // Right: Contact No.
  doc.setFont("helvetica", "bold")
  doc.setTextColor(51, 65, 85)
  doc.text("Contact No.:", margin + 3.8, y)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(15, 23, 42)
  doc.text(data.payerPhone || "—", margin + 4.5, y)
  doc.setDrawColor(226, 232, 240)
  doc.line(margin + 4.5, y + 0.02, rightX, y + 0.02)

  // ── 4. Amount Box (Bottom Left) & Signatures (Right) ─────────────────────
  y += 0.22

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

  // Center-Right Signature: Received By Image (PNG format)
  try {
    const accSigImg = new Image()
    accSigImg.src = "/signature/Accounts_Signature.png"
    await new Promise((resolve) => {
      accSigImg.onload = resolve
      accSigImg.onerror = resolve
    })
    const nw = accSigImg.naturalWidth || accSigImg.width || 200
    const nh = accSigImg.naturalHeight || accSigImg.height || 100
    const aspect = nw / nh
    const maxH = 0.22
    const maxW = 1.1
    let sigW = maxH * aspect
    let sigH = maxH
    if (sigW > maxW) {
      sigW = maxW
      sigH = sigW / aspect
    }
    const sigX = margin + 2.85 - sigW / 2
    doc.addImage(accSigImg, "PNG", sigX, sigY - sigH - 0.01, sigW, sigH)
  } catch (err) {
    console.warn("Accounts signature load failed:", err)
  }

  // Received By Line & Label
  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.006)
  doc.line(margin + 2.2, sigY, margin + 3.5, sigY)
  doc.setFontSize(5.5)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  doc.text("Received By", margin + 2.85, sigY + 0.08, { align: "center" })

  // Right Signature: Authorized Signature Image (PNG format)
  try {
    const authSigImg = new Image()
    authSigImg.src = "/signature/Authorized_Signature.png"
    await new Promise((resolve) => {
      authSigImg.onload = resolve
      authSigImg.onerror = resolve
    })
    const nw = authSigImg.naturalWidth || authSigImg.width || 200
    const nh = authSigImg.naturalHeight || authSigImg.height || 100
    const aspect = nw / nh
    const maxH = 0.22
    const maxW = 1.2
    let sigW = maxH * aspect
    let sigH = maxH
    if (sigW > maxW) {
      sigW = maxW
      sigH = sigW / aspect
    }
    const sigX = rightX - 0.7 - sigW / 2
    doc.addImage(authSigImg, "PNG", sigX, sigY - sigH - 0.01, sigW, sigH)
  } catch (err) {
    console.warn("Authorized signature load failed:", err)
  }

  // Authorized Signature Line & Label
  doc.line(rightX - 1.4, sigY, rightX, sigY)
  doc.text("Authorized Signature", rightX - 0.7, sigY + 0.08, { align: "center" })

  // ── 5. Footer Bar (Clean Bottom Bar with Base64 PNG icons) ───────────────
  const footerY = pageH - margin - 0.10

  // Optional thin top divider for footer
  doc.setDrawColor(241, 245, 249)
  doc.setLineWidth(0.005)
  doc.line(margin + 0.08, footerY - 0.08, rightX, footerY - 0.08)

  doc.setFontSize(5)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(0, 0, 0) // Pure Black text

  const webStr = "aestheticinteriorbd.com"
  const igStr = "aesthetic.interior.studio"
  const fbStr = "aestheticinteriorofficial"
  const divider = "   |   "

  const footerIconDim = 0.046
  const footerIconGap = 0.02
  const divWidth = doc.getTextWidth(divider)

  const wWeb = (icons.globe ? footerIconDim + footerIconGap : 0) + doc.getTextWidth(webStr)
  const wIg = (icons.instagram ? footerIconDim + footerIconGap : 0) + doc.getTextWidth(igStr)
  const wFb = (icons.facebook ? footerIconDim + footerIconGap : 0) + doc.getTextWidth(fbStr)

  const totalFooterWidth = wWeb + divWidth + wIg + divWidth + wFb
  let currentX = (pageW - totalFooterWidth) / 2

  // Web Item
  if (icons.globe) {
    doc.addImage(icons.globe, "PNG", currentX, footerY - 0.036, footerIconDim, footerIconDim)
    currentX += footerIconDim + footerIconGap
  }
  doc.text(webStr, currentX, footerY)
  currentX += doc.getTextWidth(webStr)

  // Divider 1
  doc.text(divider, currentX, footerY)
  currentX += divWidth

  // Instagram Item
  if (icons.instagram) {
    doc.addImage(icons.instagram, "PNG", currentX, footerY - 0.036, footerIconDim, footerIconDim)
    currentX += footerIconDim + footerIconGap
  }
  doc.text(igStr, currentX, footerY)
  currentX += doc.getTextWidth(igStr)

  // Divider 2
  doc.text(divider, currentX, footerY)
  currentX += divWidth

  // Facebook Item
  if (icons.facebook) {
    doc.addImage(icons.facebook, "PNG", currentX, footerY - 0.036, footerIconDim, footerIconDim)
    currentX += footerIconDim + footerIconGap
  }
  doc.text(fbStr, currentX, footerY)



  // Save File
  const filename = `money-receipt-${receiptNum.replace(/[^A-Za-z0-9_-]/g, "")}.pdf`
  doc.save(filename)
}
