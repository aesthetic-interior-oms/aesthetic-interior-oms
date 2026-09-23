"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Users,
  Building,
  ArrowRight,
  Sparkles,
  RefreshCw,
  ShoppingBag,
  Clock,
  Layers,
  CheckCircle2,
} from "lucide-react"

interface StockSummary {
  totalInventoryValue: number
  totalItemsCount: number
  lowStockCount: number
  totalStockInValueMonth: number
  totalDeptIssuedValueMonth: number
  categoryStats: Record<string, { count: number; totalValue: number }>
  departmentStats: Record<string, number>
}

export default function HRDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<StockSummary | null>(null)

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/finance/stock/summary", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.summary) {
          setSummary(data.summary)
        }
      }
    } catch (error) {
      console.error("Failed to load HR stock summary:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Onboarding Welcome Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 p-6 text-white shadow-lg">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-purple-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
              Human Resources Portal
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Welcome to the HR Dashboard
            </h1>
            <p className="text-purple-100/80 text-sm max-w-xl">
              Manage Human Resources inventory, stationery, pantry supplies, and department stock allocations seamlessly in one unified portal.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              className="bg-white text-indigo-950 hover:bg-purple-50 font-semibold shadow-md"
            >
              <Link href="/crm/hr/stocks">
                <Package className="w-4 h-4 mr-2" />
                Manage HR Stocks
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchSummary}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Stock Items
            </CardTitle>
            <div className="p-2 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : summary?.totalItemsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active inventory items registered
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
            <div className="p-2 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {loading ? "..." : summary?.lowStockCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Items at or below minimum threshold
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Inventory Value
            </CardTitle>
            <div className="p-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `৳${(summary?.totalInventoryValue || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total stock valuation in system
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Department Issues
            </CardTitle>
            <div className="p-2 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 rounded-lg">
              <Building className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? "..." : `৳${(summary?.totalDeptIssuedValueMonth || 0).toLocaleString()}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Consumables issued to teams this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Navigation & HR Stock Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">HR Stock Categories</CardTitle>
              <CardDescription>Office supplies, pantry, IT items & stationery</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/crm/hr/stocks">
                View All Stocks
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Stationery & Office</h4>
                  <p className="text-xs text-muted-foreground">Pens, pads, files, printer paper</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Pantry & Hygiene</h4>
                  <p className="text-xs text-muted-foreground">Coffee, tissue, soap, cleaning items</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">IT & Hardware Assets</h4>
                  <p className="text-xs text-muted-foreground">Peripherals, cables, adapters</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-border bg-muted/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">Department Allocations</h4>
                  <p className="text-xs text-muted-foreground">Staff & team stock distributions</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR Quick Actions Sidebar Widget */}
        <Card className="border border-border shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
              <CardDescription>Frequent HR tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start gap-2" variant="outline">
                <Link href="/crm/hr/stocks">
                  <Package className="w-4 h-4 text-purple-600" />
                  View Stocks Page
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gap-2" variant="outline">
                <Link href="/crm/hr/stocks?action=new">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  Register New Stock Item
                </Link>
              </Button>
              <Button asChild className="w-full justify-start gap-2" variant="outline">
                <Link href="/crm/hr/stocks?action=issue">
                  <Building className="w-4 h-4 text-emerald-600" />
                  Issue Stock to Department
                </Link>
              </Button>
            </CardContent>
          </div>
          <div className="p-4 m-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>Human Resources onboarding completed successfully.</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
