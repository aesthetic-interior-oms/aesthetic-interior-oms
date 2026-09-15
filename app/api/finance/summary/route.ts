import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { auth } from "@clerk/nextjs/server"

export const runtime = "nodejs"
export const preferredRegion = "sin1"
export const dynamic = "force-dynamic"

async function getDbUser() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null
  return prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  SITE_VISIT_PAYMENT: "Site Visit Fee",
  CLIENT_PAYMENT: "Client Payment",
  PROJECT_ADVANCE: "Project Advance",
  DESIGN_FEE: "Design Fee",
  CONSULTANCY_FEE: "Consultancy Fee",
  BANK_INTEREST: "Bank Interest",
  OTHER_INCOME: "Other Income",
  OFFICE_RENT: "Office Rent",
  SALARY: "Staff Salary",
  SALARY_ADVANCE: "Salary Advance",
  BONUS: "Bonus",
  ELECTRICITY_BILL: "Electricity Bill",
  WATER_BILL: "Water Bill",
  INTERNET_BILL: "Internet Bill",
  FOOD_ALLOWANCE: "Food Allowance",
  CLIENT_ENTERTAINMENT: "Client Entertainment",
  PROMOTION: "Marketing & Promotion",
  MOBILE_RECHARGE: "Mobile Recharge",
  OCTANE_FUEL: "Octane & Fuel",
  DONATION: "Donation",
  BOARD_MATERIAL: "Board Material",
  PASTING_BILL: "Pasting Bill",
  FARING: "Faring",
  HPL: "HPL",
  LINER: "Liner",
  LUBER: "Luber",
  ACRYLIC: "Acrylic",
  HARDWARE: "Hardware",
  ELECTRIC_ITEM: "Electric Items",
  LIGHTING: "Lighting",
  GLASS: "Glass",
  TRANSPORT_COST: "Transport & Labor",
  SITE_EXPENSE: "Site Expense",
  FACTORY_PAYMENT: "Factory Payment",
  CARPENTER_PAYMENT: "Carpenter Payment",
  PAINT_MATERIALS: "Paint Materials",
  PAINT_PAYMENT: "Paint Payment",
  CEILING_PAYMENT: "Ceiling Payment",
  DOOR: "Door Purchase",
  PLUMBER_PAYMENT: "Plumber Payment",
  TILES_PURCHASE: "Tiles Purchase",
  FOLDING_DOOR: "Folding Door",
  GLASS_PROFILE: "Glass Profile",
  CIVIL_WORK: "Civil Work",
  OTHERS: "Other Expenses",
}

function catLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat
}

export async function GET(request: NextRequest) {
  try {
    const user = await getDbUser()
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get("startDate")
    const endDateStr   = searchParams.get("endDate")

    const dateFilter: Record<string, Date> = {}
    if (startDateStr) dateFilter.gte = new Date(startDateStr)
    if (endDateStr) {
      const end = new Date(endDateStr)
      end.setHours(23, 59, 59, 999)
      dateFilter.lte = end
    }

    const where: Record<string, unknown> = {}
    if (startDateStr || endDateStr) where.date = dateFilter

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        financeAccount: { select: { id: true, name: true } },
        lead:           { select: { id: true, name: true } },
        recordedBy:     { select: { id: true, fullName: true } },
        collectedBy:    { select: { id: true, fullName: true } },
      },
      orderBy: { date: "asc" },
    })

    type TxDetail = {
      id: string
      date: string
      particular: string
      category: string
      categoryLabel: string
      amount: number
      accountName: string
      voucherNo: string | null
      recordedBy: string
      collectedBy: string | null
    }

    type SummaryRow = {
      groupKey: string
      leadId: string | null
      leadName: string
      amount: number
      txCount: number
      transactions: TxDetail[]
    }

    type AccountStat = {
      accountId: string
      accountName: string
      inflow: number
      outflow: number
    }

    const inflowMap  = new Map<string, SummaryRow>()
    const outflowMap = new Map<string, SummaryRow>()
    const accountMap = new Map<string, AccountStat>()
    let totalInflow  = 0
    let totalOutflow = 0

    for (const tx of transactions) {
      const accountId   = tx.financeAccountId ?? "no-account"
      const accountName = tx.financeAccount?.name ?? "Unknown Account"

      // Group purely by project (leadId), or "Office" if no lead
      const leadId   = tx.leadId ?? null
      const leadName = tx.lead?.name ?? "Office"
      const groupKey = leadId ? `lead__${leadId}` : `office`

      const txDetail: TxDetail = {
        id:            tx.id,
        date:          tx.date.toISOString(),
        particular:    tx.particular,
        category:      tx.category,
        categoryLabel: catLabel(tx.category),
        amount:        tx.amount,
        accountName,
        voucherNo:     tx.voucherNo ?? null,
        recordedBy:    tx.recordedBy?.fullName ?? "Unknown",
        collectedBy:   tx.collectedBy?.fullName ?? null,
      }

      // per-account totals for Account Situation card
      const acct = accountMap.get(accountId) ?? { accountId, accountName, inflow: 0, outflow: 0 }

      if (tx.type === "INFLOW") {
        acct.inflow += tx.amount
        totalInflow += tx.amount
        const row = inflowMap.get(groupKey)
        if (row) {
          row.amount += tx.amount
          row.txCount++
          row.transactions.push(txDetail)
        } else {
          inflowMap.set(groupKey, { groupKey, leadId, leadName, amount: tx.amount, txCount: 1, transactions: [txDetail] })
        }
      } else {
        acct.outflow += tx.amount
        totalOutflow += tx.amount
        const row = outflowMap.get(groupKey)
        if (row) {
          row.amount += tx.amount
          row.txCount++
          row.transactions.push(txDetail)
        } else {
          outflowMap.set(groupKey, { groupKey, leadId, leadName, amount: tx.amount, txCount: 1, transactions: [txDetail] })
        }
      }
      accountMap.set(accountId, acct)
    }

    const sort = (a: SummaryRow, b: SummaryRow) => {
      // Put Office at the bottom or top, rest alphabetical
      if (a.leadName === "Office") return 1
      if (b.leadName === "Office") return -1
      return a.leadName.localeCompare(b.leadName)
    }

    const inflowRows  = Array.from(inflowMap.values()).sort(sort)
    const outflowRows = Array.from(outflowMap.values()).sort(sort)
    const accountSummary = Array.from(accountMap.values()).sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    )

    return NextResponse.json({
      success: true,
      inflow:  inflowRows,
      outflow: outflowRows,
      accountSummary,
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
    })
  } catch (error: unknown) {
    console.error("[GET /api/finance/summary] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
