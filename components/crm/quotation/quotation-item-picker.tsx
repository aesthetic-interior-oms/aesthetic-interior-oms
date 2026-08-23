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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getQuotationTemplate } from '@/lib/quotation-templates'
import { formatTemplatePriceHint } from '@/lib/quotation-templates/helpers'
import { QuotationTemplateItem } from '@/lib/quotation-types'

type CatalogOption = {
  key: string
  name: string
}

type QuotationItemPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogs: CatalogOption[]
  fullTemplates?: any[]
  catalogTemplateKey: string
  onCatalogTemplateKeyChange: (key: string) => void
  onSelectItem: (templateItemId: string, catalogTemplateKey: string) => void
}

export function QuotationItemPicker({
  open,
  onOpenChange,
  catalogs,
  fullTemplates = [],
  catalogTemplateKey,
  onCatalogTemplateKeyChange,
  onSelectItem,
}: QuotationItemPickerProps) {
  const [query, setQuery] = useState('')
  const template = useMemo(() => {
    if (fullTemplates?.length) {
      return fullTemplates.find(t => t.key === catalogTemplateKey) || getQuotationTemplate(catalogTemplateKey)
    }
    return getQuotationTemplate(catalogTemplateKey)
  }, [catalogTemplateKey, fullTemplates])

  const sections = useMemo(
    () => [...template.sections].sort((a, b) => a.sortOrder - b.sortOrder),
    [template.sections],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return template.items.filter((item: QuotationTemplateItem) => {
      if (!normalizedQuery) return true
      return (
        item.description.toLowerCase().includes(normalizedQuery) ||
        item.materials.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, template.items])

  const sectionNameById = useMemo(
    () => new Map(template.sections.map((section: any) => [section.id, section.name])),
    [template.sections],
  )

  const handleSelect = (templateItemId: string) => {
    onSelectItem(templateItemId, catalogTemplateKey)
    onOpenChange(false)
    setQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add from saved list</DialogTitle>
          <DialogDescription>
            Choose a catalog (Ceiling, TV Unit, Folding Door), pick an item, then edit on the floor.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 space-y-3 border-b py-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Catalog</p>
            <Select value={catalogTemplateKey} onValueChange={onCatalogTemplateKeyChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {catalogs.map((catalog) => (
                  <SelectItem key={catalog.key} value={catalog.key}>
                    {catalog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          {sections.map((section: any) => {
            const sectionItems = filteredItems.filter((item: QuotationTemplateItem) => item.sectionId === section.id)
            if (sectionItems.length === 0) return null

            return (
              <div key={section.id} className="mb-5 last:mb-0">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {section.name}
                </p>
                <div className="space-y-2">
                  {sectionItems.map((item: QuotationTemplateItem) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-medium">{item.description}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {String(sectionNameById.get(item.sectionId) ?? item.sectionId)}
                          </Badge>
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
