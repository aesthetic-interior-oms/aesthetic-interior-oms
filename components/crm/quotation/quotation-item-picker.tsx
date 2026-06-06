'use client'

import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatTemplatePriceHint } from '@/lib/quotation-templates/helpers'
import type { QuotationTemplateDefinition } from '@/lib/quotation-types'

type QuotationItemPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: QuotationTemplateDefinition
  sectionId?: string | null
  onSelectItem: (templateItemId: string) => void
}

export function QuotationItemPicker({
  open,
  onOpenChange,
  template,
  sectionId,
  onSelectItem,
}: QuotationItemPickerProps) {
  const [query, setQuery] = useState('')

  const sections = useMemo(() => {
    const sorted = [...template.sections].sort((a, b) => a.sortOrder - b.sortOrder)
    if (!sectionId) return sorted
    return sorted.filter((section) => section.id === sectionId)
  }, [sectionId, template.sections])

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return template.items.filter((item) => {
      if (sectionId && item.sectionId !== sectionId) return false
      if (!normalizedQuery) return true
      return (
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.materials.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, sectionId, template.items])

  const sectionNameById = useMemo(
    () => new Map(template.sections.map((section) => [section.id, section.name])),
    [template.sections],
  )

  const handleSelect = (templateItemId: string) => {
    onSelectItem(templateItemId)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add from saved list</DialogTitle>
          <DialogDescription>
            Pick items from the {template.name} PDF catalog. You can edit name, materials, rate, and
            sqft after adding.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 border-b py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {sections.map((section) => {
            const sectionItems = filteredItems.filter((item) => item.sectionId === section.id)
            if (sectionItems.length === 0) return null

            return (
              <div key={section.id} className="mb-5 last:mb-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.name}
                </p>
                <div className="space-y-2">
                  {sectionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.description}</p>
                          {!sectionId ? (
                            <Badge variant="outline" className="text-[10px]">
                              {sectionNameById.get(item.sectionId) ?? item.sectionId}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="line-clamp-2 text-xs text-muted-foreground">{item.materials}</p>
                        <p className="text-xs text-muted-foreground">
                          PDF rate: {formatTemplatePriceHint(item)} • Unit: {item.unit}
                        </p>
                      </div>
                      <Button type="button" size="sm" onClick={() => handleSelect(item.id)}>
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {filteredItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No items match your search.</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
