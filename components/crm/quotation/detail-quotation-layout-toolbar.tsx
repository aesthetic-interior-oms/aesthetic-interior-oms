'use client'

import { Columns2, LayoutPanelLeft, LayoutPanelTop, Rows2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { DetailQuotationLayoutMode } from '@/lib/detail-quotation-format'

type DetailQuotationLayoutToolbarProps = {
  layout: DetailQuotationLayoutMode
  onLayoutChange: (layout: DetailQuotationLayoutMode) => void
}

const LAYOUT_OPTIONS: Array<{
  value: DetailQuotationLayoutMode
  label: string
  icon: typeof Columns2
}> = [
  { value: 'split-right', label: 'Edit left · Preview right', icon: Columns2 },
  { value: 'split-left', label: 'Preview left · Edit right', icon: LayoutPanelLeft },
  { value: 'stacked', label: 'Edit top · Preview bottom', icon: LayoutPanelTop },
  { value: 'tabs', label: 'Tabs', icon: Rows2 },
]

export function DetailQuotationLayoutToolbar({
  layout,
  onLayoutChange,
}: DetailQuotationLayoutToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium text-muted-foreground">Layout</span>
      {LAYOUT_OPTIONS.map((option) => {
        const Icon = option.icon
        const active = layout === option.value
        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={active ? 'default' : 'outline'}
            onClick={() => onLayoutChange(option.value)}
            title={option.label}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
