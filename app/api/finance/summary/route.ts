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

    let startDate: Date | null = null
    let endDate: Date | null = null

    if (startDateStr) {
      startDate = new Date(startDateStr)
    }
    if (endDateStr) {
      const end = new Date(endDateStr)
      end.setHours(23, 59, 59, 999)
      endDate = end
    }

    // 1. Fetch ALL finance accounts
    const allAccounts = await prisma.financeAccount.findMany({
      orderBy: { name: "asc" }
    })
    const accountMap = new Map<string, { id: string; name: string }>()
    for (const a of allAccounts) {
      accountMap.set(a.id, { id: a.id, name: a.name })
    }

    // 2. Compute Prior Balances (transactions before startDate)
    const priorAccountOpening = new Map<string, number>()
    let globalOpeningBalance = 0

    if (startDate) {
      const priorTransactions = await prisma.transaction.groupBy({
        by: ["financeAccountId", "type"],
        where: {
          date: { lt: startDate }
        },
        _sum: { amount: true }
      })

      for (const group of priorTransactions) {
        const accId = group.financeAccountId ?? "no-account"
        const sum = group._sum.amount ?? 0
        const currentVal = priorAccountOpening.get(accId) ?? 0
        if (group.type === "INFLOW") {
          priorAccountOpening.set(accId, currentVal + sum)
          globalOpeningBalance += sum
        } else {
          priorAccountOpening.set(accId, currentVal - sum)
          globalOpeningBalance -= sum
        }
      }
    }

    // 3. Fetch Period Transactions
    const periodWhere: Record<string, unknown> = {}
    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {}
      if (startDate) dateFilter.gte = startDate
      if (endDate) dateFilter.lte = endDate
      periodWhere.date = dateFilter
    }

    const transactions = await prisma.transaction.findMany({
      where: periodWhere,
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
      openingBalance: number
      inflow: number
      outflow: number
      closingBalance: number
    }

    const inflowMap  = new Map<string, SummaryRow>()
    const outflowMap = new Map<string, SummaryRow>()
    
    // Initialize account situation map with opening balances
    const accountSituationMap = new Map<string, AccountStat>()
    for (const acc of allAccounts) {
      const opening = priorAccountOpening.get(acc.id) ?? 0
      accountSituationMap.set(acc.id, {
        accountId: acc.id,
        accountName: acc.name,
        openingBalance: opening,
        inflow: 0,
        outflow: 0,
        closingBalance: opening,
      })
    }

    let totalInflow  = 0
    let totalOutflow = 0

    for (const tx of transactions) {
      const accountId   = tx.financeAccountId ?? "no-account"
      const accountName = tx.financeAccount?.name ?? "Unknown Account"

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

      let acct = accountSituationMap.get(accountId)
      if (!acct) {
        const opening = priorAccountOpening.get(accountId) ?? 0
        acct = {
          accountId,
          accountName,
          openingBalance: opening,
          inflow: 0,
          outflow: 0,
          closingBalance: opening,
        }
      }

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

      acct.closingBalance = acct.openingBalance + acct.inflow - acct.outflow
      accountSituationMap.set(accountId, acct)
    }

    const sortRows = (a: SummaryRow, b: SummaryRow) => {
      if (a.leadName === "Office") return 1
      if (b.leadName === "Office") return -1
      return a.leadName.localeCompare(b.leadName)
    }

    const inflowRows  = Array.from(inflowMap.values()).sort(sortRows)
    const outflowRows = Array.from(outflowMap.values()).sort(sortRows)
    const accountSummary = Array.from(accountSituationMap.values()).sort((a, b) =>
      a.accountName.localeCompare(b.accountName)
    )

    const closingBalance = globalOpeningBalance + totalInflow - totalOutflow

    // 4. Build Monthly History (Last 12 months up to current month)
    type MonthlyHistoryRow = {
      year: number
      month: number
      monthLabel: string
      openingBalance: number
      inflow: number
      outflow: number
      netChange: number
      closingBalance: number
    }

    const monthlyHistory: MonthlyHistoryRow[] = []
    const now = new Date()
    const targetYear = startDate ? startDate.getFullYear() : now.getFullYear()

    // Query all transactions to build monthly breakdown for target year
    const yearStart = new Date(targetYear, 0, 1)
    const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59, 999)

    // Pre-year opening balance
    const preYearAgg = await prisma.transaction.groupBy({
      by: ["type"],
      where: { date: { lt: yearStart } },
      _sum: { amount: true }
    })
    let runningBalance = 0
    for (const g of preYearAgg) {
      const sum = g._sum.amount ?? 0
      if (g.type === "INFLOW") runningBalance += sum
      else runningBalance -= sum
    }

    const yearTransactions = await prisma.transaction.findMany({
      where: {
        date: { gte: yearStart, lte: yearEnd }
      },
      select: {
        date: true,
        type: true,
        amount: true,
      },
      orderBy: { date: "asc" }
    })

    // Group transactions by month index (0..11)
    const monthlyTotals = Array.from({ length: 12 }, () => ({ inflow: 0, outflow: 0 }))
    for (const tx of yearTransactions) {
      const m = tx.date.getMonth()
      if (tx.type === "INFLOW") monthlyTotals[m].inflow += tx.amount
      else monthlyTotals[m].outflow += tx.amount
    }

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]

    for (let m = 0; m < 12; m++) {
      // Don't show future months if in current year
      if (targetYear === now.getFullYear() && m > now.getMonth()) break

      const monthOpening = runningBalance
      const inflow = monthlyTotals[m].inflow
      const outflow = monthlyTotals[m].outflow
      const netChange = inflow - outflow
      const monthClosing = monthOpening + netChange

      monthlyHistory.push({
        year: targetYear,
        month: m,
        monthLabel: `${monthNames[m]} ${targetYear}`,
        openingBalance: monthOpening,
        inflow,
        outflow,
        netChange,
        closingBalance: monthClosing,
      })

      runningBalance = monthClosing
    }

    return NextResponse.json({
      success: true,
      inflow: inflowRows,
      outflow: outflowRows,
      accountSummary,
      monthlyHistory,
      openingBalance: globalOpeningBalance,
      totalInflow,
      totalOutflow,
      netBalance: totalInflow - totalOutflow,
      closingBalance,
    })
  } catch (error: unknown) {
    console.error("[GET /api/finance/summary] failed", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
