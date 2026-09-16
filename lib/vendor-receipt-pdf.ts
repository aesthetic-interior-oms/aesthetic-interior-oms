/**
 * Generates a clean, professional Vendor Payment Receipt PDF for Aesthetic Interior
 */
export async function downloadVendorPaymentReceiptPDF(paymentData: {
  voucherNo?: string | null
  paymentDate: string
  amount: number
  paymentMethod: string
  note?: string | null
  vendor: {
    vendorId: string
    vendorName: string
    vendorCompanyName?: string | null
    vendorType: string
    primaryPhone?: string | null
    primaryEmail?: string | null
  }
  project: {
    name: string
    location?: string | null
  }
  agreement?: {
    agreementValue: number
    totalPaid: number
    balance: number
  }
}) {
  const { default: jsPDF } = await import("jspdf")
  const { default: autoTable } = await import("jspdf-autotable")

  const doc = new jsPDF({ orientation: "portrait" })
  const pageW = doc.internal.pageSize.getWidth()
  const dateStr = new Date(paymentData.paymentDate).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

  // Load Header Logo
  const logoImg = new Image()
  logoImg.src = "/Logo/HeaderLogo.png"
  await new Promise((resolve) => {
    logoImg.onload = resolve
    logoImg.onerror = resolve
  })

  // Header Logo
  doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

  // Title on Right Header
  doc.setFontSize(12)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("VENDOR PAYMENT RECEIPT", pageW - 14, 18, { align: "right" })

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(100, 116, 139)
  const voucherNum = paymentData.voucherNo || `VND-PAY-${Date.now().toString().slice(-6)}`
  doc.text(`Receipt No: ${voucherNum}`, pageW - 14, 23, { align: "right" })
  doc.text(`Date: ${dateStr}`, pageW - 14, 28, { align: "right" })

  let y = 38

  // Vendor & Project Info Box
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.4)
  doc.roundedRect(14, y, pageW - 28, 32, 2, 2, "FD")

  // Left Side: Vendor Info
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("PAID TO (VENDOR):", 18, y + 7)
  doc.setFontSize(10)
  doc.text(paymentData.vendor.vendorName, 18, y + 13)

  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  const vendorSub = paymentData.vendor.vendorCompanyName
    ? `${paymentData.vendor.vendorCompanyName} (${paymentData.vendor.vendorId})`
    : `ID: ${paymentData.vendor.vendorId}`
  doc.text(vendorSub, 18, y + 18)
  doc.text(`Type: ${paymentData.vendor.vendorType.replace(/_/g, " ")}`, 18, y + 23)
  if (paymentData.vendor.primaryPhone) {
    doc.text(`Phone: ${paymentData.vendor.primaryPhone}`, 18, y + 28)
  }

  // Right Side: Project Info
  const rightX = pageW / 2 + 10
  doc.setFontSize(9)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(30, 41, 59)
  doc.text("PROJECT / SITE DETAILS:", rightX, y + 7)

  doc.setFontSize(9)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  doc.text(`Project: ${paymentData.project.name}`, rightX, y + 13)
  if (paymentData.project.location) {
    doc.text(`Location: ${paymentData.project.location}`, rightX, y + 18)
  }
  doc.text(`Payment Method: ${paymentData.paymentMethod.replace(/_/g, " ")}`, rightX, y + 23)

  y += 38

  // Payment Breakdown Table
  autoTable(doc, {
    startY: y,
    head: [["Particulars / Payment Description", "Payment Method", "Amount Paid (BDT)"]],
    body: [
      [
        paymentData.note || `Vendor payment for work completed on site ${paymentData.project.name}`,
        paymentData.paymentMethod.replace(/_/g, " "),
        `${paymentData.amount.toLocaleString("en-BD")} BDT`,
      ],
    ],
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [30, 41, 59],
    },
    columnStyles: {
      0: { cellWidth: "auto" },
      1: { cellWidth: 40, halign: "center" },
      2: { cellWidth: 45, halign: "right", fontStyle: "bold" },
    },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 8

  // Agreement Position Summary (if provided)
  if (paymentData.agreement) {
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.3)
    doc.roundedRect(14, finalY, pageW - 28, 20, 1.5, 1.5, "FD")

    doc.setFontSize(8)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(71, 85, 105)
    doc.text("CONTRACT ACCOUNT POSITION:", 18, finalY + 6)

    doc.setFont("helvetica", "normal")
    doc.text(`Total Contract Value: ${paymentData.agreement.agreementValue.toLocaleString("en-BD")} BDT`, 18, finalY + 12)
    doc.text(`Total Paid to Date: ${paymentData.agreement.totalPaid.toLocaleString("en-BD")} BDT`, 18, finalY + 16)

    doc.setFont("helvetica", "bold")
    doc.setTextColor(180, 83, 9) // Amber color for balance
    doc.text(
      `Remaining Balance Owed: ${paymentData.agreement.balance.toLocaleString("en-BD")} BDT`,
      pageW / 2 + 10,
      finalY + 12
    )

    finalY += 28
  } else {
    finalY += 10
  }

  // Large Total Amount Paid Box
  doc.setFillColor(236, 253, 245)
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.5)
  doc.roundedRect(14, finalY, pageW - 28, 14, 2, 2, "FD")

  doc.setFontSize(10)
  doc.setFont("helvetica", "bold")
  doc.setTextColor(6, 95, 70)
  doc.text("TOTAL AMOUNT PAID:", 18, finalY + 9)
  doc.text(`${paymentData.amount.toLocaleString("en-BD")} BDT`, pageW - 18, finalY + 9, { align: "right" })

  // Signatures at bottom
  const sigY = finalY + 40

  doc.setDrawColor(148, 163, 184)
  doc.setLineWidth(0.4)

  // Left signature: Received by Vendor
  doc.line(18, sigY, 70, sigY)
  doc.setFontSize(8)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(71, 85, 105)
  doc.text("Received By (Vendor Signature)", 18, sigY + 5)

  // Right signature: Authorized Accounts Signatory
  doc.line(pageW - 70, sigY, pageW - 18, sigY)
  doc.text("Authorized By (Accounts Team)", pageW - 70, sigY + 5)

  // Save File
  const filename = `vendor-receipt-${paymentData.vendor.vendorId}-${dateStr.replace(/ /g, "-")}.pdf`
  doc.save(filename)
}
