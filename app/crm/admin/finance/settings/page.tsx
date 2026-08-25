"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import {
  PlusCircle,
  Trash2,
  Tag,
  Building,
  FileText,
  Calendar,
  Briefcase,
  Wrench,
  Wallet,
  HandCoins,
  Landmark,
  TrendingUp,
  Receipt,
  DollarSign,
  PieChart,
  ChevronLeft,
} from "lucide-react"

// Types matching page.tsx
type TransactionCategoryType = "OUTFLOW" | "INFLOW"
type TransactionCategory = {
  key: string
  label: string
  icon: any
  isCustom?: boolean
}

const EXPENSE_CATEGORIES: TransactionCategory[] = [
  { key: "OFFICE_RENT", label: "Office Rent", icon: Building },
  { key: "UTILITIES", label: "Utilities", icon: Receipt },
  { key: "SALARY", label: "Employee Salary", icon: DollarSign },
  { key: "MARKETING", label: "Marketing / Ads", icon: PieChart },
  { key: "SITE_VISIT", label: "Site Visit Expenses", icon: Calendar },
  { key: "CONVEYANCE", label: "Conveyance", icon: Briefcase },
  { key: "CIVIL_WORK", label: "Civil Work", icon: Wrench },
  { key: "OTHERS", label: "Other Expenses", icon: Tag },
]

const INCOME_CATEGORIES: TransactionCategory[] = [
  { key: "CLIENT_PAYMENT", label: "Client Payment", icon: Wallet },
  { key: "PROJECT_ADVANCE", label: "Project Advance", icon: HandCoins },
  { key: "DESIGN_FEE", label: "Design Fee", icon: FileText },
  { key: "CONSULTANCY_FEE", label: "Consultancy Fee", icon: Briefcase },
  { key: "BANK_INTEREST", label: "Bank Interest", icon: Landmark },
  { key: "OTHER_INCOME", label: "Other Income", icon: TrendingUp },
]

const CUSTOM_CATEGORY_STORAGE_KEY = "finance-custom-transaction-categories"

const formatCustomCategoryKey = (name: string, type: TransactionCategoryType) =>
  `CUSTOM_${type}_${name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "")}`

export default function FinanceSettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TransactionCategoryType>("OUTFLOW")
  const [newCategoryName, setNewCategoryName] = useState("")
  const [customCategories, setCustomCategories] = useState<Record<TransactionCategoryType, TransactionCategory[]>>({
    OUTFLOW: [],
    INFLOW: [],
  })

  // Load custom categories from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem(CUSTOM_CATEGORY_STORAGE_KEY)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Record<string, Omit<TransactionCategory, "icon">[]>
        setCustomCategories({
          OUTFLOW: (parsed.OUTFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
          INFLOW: (parsed.INFLOW || []).map((item) => ({ ...item, icon: Tag, isCustom: true })),
        })
      } catch (error) {
        console.error("Failed to parse custom categories", error)
      }
    }
  }, [])

  // Persist back to localStorage
  const saveCustomCategories = (nextCategories: Record<TransactionCategoryType, TransactionCategory[]>) => {
    const serializable = {
      OUTFLOW: nextCategories.OUTFLOW.map(({ key, label, isCustom }) => ({ key, label, isCustom })),
      INFLOW: nextCategories.INFLOW.map(({ key, label, isCustom }) => ({ key, label, isCustom })),
    }
    window.localStorage.setItem(CUSTOM_CATEGORY_STORAGE_KEY, JSON.stringify(serializable))
    setCustomCategories(nextCategories)
  }

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCategoryName.trim()
    if (!trimmed) {
      toast.error("Please enter a category name")
      return
    }

    const key = formatCustomCategoryKey(trimmed, activeTab)
    const defaults = activeTab === "OUTFLOW" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES
    const currentCustoms = customCategories[activeTab]

    // Check duplicates
    if (
      defaults.some((item) => item.key === key || item.label.toLowerCase() === trimmed.toLowerCase()) ||
      currentCustoms.some((item) => item.key === key || item.label.toLowerCase() === trimmed.toLowerCase())
    ) {
      toast.error("This category name already exists.")
      return
    }

    const newCat: TransactionCategory = {
      key,
      label: trimmed,
      icon: Tag,
      isCustom: true,
    }

    const updated = {
      ...customCategories,
      [activeTab]: [newCat, ...currentCustoms],
    }

    saveCustomCategories(updated)
    setNewCategoryName("")
    toast.success("Category added successfully!")
  }

  const handleDeleteCategory = (keyToDelete: string) => {
    const updated = {
      ...customCategories,
      [activeTab]: customCategories[activeTab].filter((item) => item.key !== keyToDelete),
    }
    saveCustomCategories(updated)
    toast.success("Category deleted successfully.")
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Link href="/crm/admin/finance" className="hover:text-foreground flex items-center gap-1 transition">
              <ChevronLeft className="w-4 h-4" /> Finance Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Settings</h1>
          <p className="text-muted-foreground">Manage your custom income and expense categories.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/admin/finance/settings/accounts">
            <Button variant="outline" className="gap-2">
              <Wallet className="w-4 h-4" /> Manage Accounts
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="OUTFLOW" value={activeTab} onValueChange={(val) => {
        setActiveTab(val as TransactionCategoryType)
        setNewCategoryName("")
      }} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md shrink-0">
          <TabsTrigger value="OUTFLOW">Expense Categories</TabsTrigger>
          <TabsTrigger value="INFLOW">Income Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="OUTFLOW" className="space-y-6">
          {renderCategoryManagement(EXPENSE_CATEGORIES, customCategories.OUTFLOW, "Expense")}
        </TabsContent>

        <TabsContent value="INFLOW" className="space-y-6">
          {renderCategoryManagement(INCOME_CATEGORIES, customCategories.INFLOW, "Income")}
        </TabsContent>
      </Tabs>
    </div>
  )

  function renderCategoryManagement(defaults: TransactionCategory[], customs: TransactionCategory[], label: string) {
    return (
      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Form */}
        <Card className="md:col-span-1 h-fit border border-border">
          <CardHeader>
            <CardTitle>Add Custom {label} Category</CardTitle>
            <CardDescription>Created categories will instantly appear in the transaction log options.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder={`Category name, e.g. Office Snacks`}
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  maxLength={30}
                />
              </div>
              <Button type="submit" className="w-full gap-2">
                <PlusCircle className="w-4 h-4" /> Add Category
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Categories List */}
        <Card className="md:col-span-2 border border-border">
          <CardHeader>
            <CardTitle>Current Categories</CardTitle>
            <CardDescription>View default system categories and manage your custom ones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Custom Categories Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                Custom Categories
                <Badge variant="secondary">{customs.length}</Badge>
              </h3>
              {customs.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-lg text-sm text-muted-foreground">
                  No custom categories added yet. Use the panel on the left to add one.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {customs.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded bg-muted/60 text-muted-foreground">
                          <Tag className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">{item.label}</span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteCategory(item.key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-border/60" />

            {/* Default System Categories Section */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                System Default Categories (Read-Only)
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {defaults.map((item) => {
                  const Icon = item.icon
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20 opacity-80"
                    >
                      <div className="p-2 rounded bg-muted text-muted-foreground">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}
