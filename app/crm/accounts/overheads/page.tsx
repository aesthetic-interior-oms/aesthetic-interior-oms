'use client'

import { useEffect, useState } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  OFFICE_RENT: 'Office Rent',
  SALARY: 'Staff Salary',
  SALARY_ADVANCE: 'Salary Advance',
  BONUS: 'Bonus',
  ELECTRICITY_BILL: 'Electricity Bill',
  WATER_BILL: 'Water Bill',
  INTERNET_BILL: 'Internet Bill',
  FOOD_ALLOWANCE: 'Food Allowance',
  CLIENT_ENTERTAINMENT: 'Client Food & Entertainment',
  PROMOTION: 'Marketing & Promotion',
  MOBILE_RECHARGE: 'Mobile Recharge',
  OCTANE_FUEL: 'Octane & Fuel',
  DONATION: 'Donation',
  OTHERS: 'Other Expenses',
  CLIENT_PAYMENT: 'Client Payment',
  PROJECT_ADVANCE: 'Project Advance',
  DESIGN_FEE: 'Design Fee',
  CONSULTANCY_FEE: 'Consultancy Fee',
  BANK_INTEREST: 'Bank Interest',
  OTHER_INCOME: 'Other Income',
}

function getDefaultMonth() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export default function OverheadsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth())
  const [monthlyReport, setMonthlyReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const loadMonthlyReport = async (month: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/reports?mode=monthly&month=${month}`)
      const data = await res.json()
      if (data.success) {
        setMonthlyReport(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonthlyReport(selectedMonth)
  }, [selectedMonth])

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Monthly Overheads & Site Summaries"
        subtitle="Rent, salary payments, electricity bills and total cost metrics."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full max-w-7xl mx-auto">

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">Select Month:</span>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="bg-card text-foreground border border-border p-2 rounded-md"
        />
      </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Loading report...</p>
        </div>
      ) : monthlyReport ? (
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Income this Month</div>
                <div className="text-2xl font-bold mt-1 text-emerald-500">
                  {monthlyReport.totals.inflow.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Office Overhead Expenses</div>
                <div className="text-2xl font-bold mt-1 text-rose-500">
                  {monthlyReport.totals.overhead.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Site Construction Expenses</div>
                <div className="text-2xl font-bold mt-1 text-orange-500">
                  {monthlyReport.totals.projectExpenses.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Net Monthly Balance</div>
                <div className={`text-2xl font-bold mt-1 ${monthlyReport.totals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {monthlyReport.totals.net.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Office Expenses Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Office Overheads Detail</CardTitle>
                <CardDescription>Category-wise breakdown for the selected month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {Object.entries(monthlyReport.overheadBreakdown || {}).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No overheads logged this month.
                    </div>
                  ) : (
                    Object.entries(monthlyReport.overheadBreakdown || {}).map(([cat, amount]: any) => (
                      <div key={cat} className="p-3 flex justify-between items-center text-sm">
                        <span className="font-medium">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-bold">{amount.toLocaleString()} BDT</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Site Expenses Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Sites Construction Spending</CardTitle>
                <CardDescription>Per-site expense breakdown for the selected month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {monthlyReport.siteExpensesBreakdown?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No project expenditures logged this month.
                    </div>
                  ) : (
                    monthlyReport.siteExpensesBreakdown?.map((site: any) => (
                      <div key={site.name} className="p-3 flex justify-between items-center text-sm">
                        <span className="font-medium">{site.name}</span>
                        <span className="font-bold text-rose-500">{site.amount.toLocaleString()} BDT</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Processing report...</div>
      )}
      </div>
    </div>
  )
}
