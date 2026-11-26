'use client'

import React from 'react'
import { CheckCircle2, Lock, Receipt, FileText, Truck, Hammer, Warehouse } from 'lucide-react'

export type MaterialItemStatusType =
  | 'NOTED'
  | 'BILLED'
  | 'PURCHASED'
  | 'DELIVERED'
  | 'APPLIED'
  | 'STORED'

const STATUS_CONFIG: Record<
  MaterialItemStatusType,
  {
    label: string
    className: string
    icon: React.ComponentType<{ className?: string }>
  }
> = {
  NOTED: {
    label: 'Noted',
    className: 'bg-muted text-muted-foreground border-border',
    icon: FileText,
  },
  BILLED: {
    label: 'Billed',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    icon: Receipt,
  },
  PURCHASED: {
    label: 'Purchased',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    icon: Lock,
  },
  DELIVERED: {
    label: 'Delivered',
    className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    icon: Truck,
  },
  APPLIED: {
    label: 'Applied',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    icon: Hammer,
  },
  STORED: {
    label: 'Stored',
    className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    icon: Warehouse,
  },
}

export function MaterialStatusBadge({
  status,
  purchasedQuantity,
  unit,
}: {
  status?: string | null
  purchasedQuantity?: number | null
  unit?: string | null
}) {
  const normalized = (status?.toUpperCase() || 'NOTED') as MaterialItemStatusType
  const cfg = STATUS_CONFIG[normalized] || STATUS_CONFIG.NOTED
  const Icon = cfg.icon

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${cfg.className}`}
      title={
        normalized === 'PURCHASED'
          ? 'Purchased & locked from BOQ edits'
          : `Material status: ${cfg.label}`
      }
    >
      <Icon className="w-2.5 h-2.5 shrink-0" />
      <span>{cfg.label}</span>
      {normalized === 'PURCHASED' && purchasedQuantity != null && (
        <span className="font-mono opacity-90">
          ({purchasedQuantity} {unit || ''})
        </span>
      )}
    </span>
  )
}
