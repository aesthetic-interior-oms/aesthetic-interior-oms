'use client'

import { useMemo, useState } from 'react'
import { BookOpen, Package2, Plus, Search } from 'lucide-react'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getQuotationTemplate } from '@/lib/quotation-templates'
import { SHORT_QUOTATION_BUNDLES, type ShortQuotationBundle } from '@/lib/short-quotation-bundles'
import type { QuotationTemplateItem } from '@/lib/quotation-types'

type CatalogOption = {
  key: string
  name: string
}

export type PickedCatalogItem = {
  type: 'catalog'
  name: string
  unitPrice: number
  catalogItemId: string
  catalogTemplateKey: string
}

export type PickedBundle = {
  type: 'bundle'
  bundle: ShortQuotationBundle
}

type ShortQuotationItemPickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  catalogs: CatalogOption[]
  fullTemplates?: any[]
  catalogTemplateKey: string
  onCatalogTemplateKeyChange: (key: string) => void
  onPickCatalogItem: (item: PickedCatalogItem) => void
  onPickBundle: (picked: PickedBundle) => void
}

export function ShortQuotationItemPicker({
  open,
  onOpenChange,
  catalogs,
  fullTemplates = [],
  catalogTemplateKey,
  onCatalogTemplateKeyChange,
  onPickCatalogItem,
  onPickBundle,
}: ShortQuotationItemPickerProps) {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'catalog' | 'bundle'>('catalog')

  const template = useMemo(() => {
    if (fullTemplates?.length) {
      return fullTemplates.find((t) => t.key === catalogTemplateKey) || getQuotationTemplate(catalogTemplateKey)
    }
    return getQuotationTemplate(catalogTemplateKey)
  }, [catalogTemplateKey, fullTemplates])

  const sections = useMemo(
    () => (Array.isArray(template?.sections) ? [...template.sections].sort((a: any, b: any) => a.sortOrder - b.sortOrder) : []),
    [template?.sections],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const items = Array.isArray(template?.items) ? template.items : []
    return items.filter((item: QuotationTemplateItem) => {
      if (!normalizedQuery) return true
      return (
        (item.description ?? '').toLowerCase().includes(normalizedQuery) ||
        (item.materials ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [query, template?.items])

  const sectionNameById = useMemo(
    () => new Map((Array.isArray(template?.sections) ? template.sections : []).map((section: any) => [section.id, section.name])),
    [template?.sections],
  )

  const handleSelectCatalogItem = (item: QuotationTemplateItem) => {
    // Use standard rate as default unit price; user can always override in the table
    const unitPrice =
      (item as any).standardRate ??
      (item as any).premiumRate ??
      (item as any).basicRate ??
      0

    onPickCatalogItem({
      type: 'catalog',
      name: item.description,
      unitPrice,
      catalogItemId: item.id,
      catalogTemplateKey,
    })
    onOpenChange(false)
    setQuery('')
  }

  const handleSelectBundle = (bundle: ShortQuotationBundle) => {
    onPickBundle({ type: 'bundle', bundle })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden sm:max-w-2xl">
        <DialogHeader className="shrink-0">
          <DialogTitle>Add item to short quotation</DialogTitle>
          <DialogDescription>
            Pick a saved catalog item (name + price pre-filled) or choose a room bundle to add multiple lines at once.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'catalog' | 'bundle')}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <TabsList className="mx-0 shrink-0 justify-start border-b rounded-none bg-transparent px-0 pt-2">
            <TabsTrigger value="catalog" className="gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              Saved Items
            </TabsTrigger>
            <TabsTrigger value="bundle" className="gap-1.5">
              <Package2 className="h-3.5 w-3.5" />
              Room Bundles
            </TabsTrigger>
          </TabsList>

          {/* ── Saved catalog items ── */}
          <TabsContent value="catalog" className="flex min-h-0 flex-1 flex-col overflow-hidden mt-0">
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto py-3">
              {sections.map((section: any) => {
                const sectionItems = filteredItems.filter(
                  (item: QuotationTemplateItem) => item.sectionId === section.id,
                )
                if (sectionItems.length === 0) return null
                return (
                  <div key={section.id} className="mb-5 last:mb-0">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.name}
                    </p>
                    <div className="space-y-2">
                      {sectionItems.map((item: QuotationTemplateItem) => {
                        const stdRate = (item as any).standardRate ?? (item as any).premiumRate ?? (item as any).basicRate ?? 0
                        return (
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
                              <p className="line-clamp-1 text-xs text-muted-foreground">{item.materials}</p>
                              {stdRate > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Suggested unit price: ৳{stdRate.toLocaleString('en-IN')} / {item.unit}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSelectCatalogItem(item)}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add
                            </Button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {filteredItems.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No items match your search.</p>
              )}
            </div>
          </TabsContent>

          {/* ── Room bundles ── */}
          <TabsContent value="bundle" className="min-h-0 flex-1 overflow-y-auto py-3 mt-0">
            <p className="mb-3 text-xs text-muted-foreground">
              Select a bundle to instantly add multiple lines to the current room. You can edit names and prices after adding.
            </p>
            <div className="space-y-3">
              {SHORT_QUOTATION_BUNDLES.map((bundle) => (
                <div
                  key={bundle.id}
                  className="flex items-start justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 space-y-1.5">
                    <p className="text-sm font-semibold">{bundle.name}</p>
                    <p className="text-xs text-muted-foreground">{bundle.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {bundle.lines.map((line, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[10px]">
                          {line.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => handleSelectBundle(bundle)}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    Add Bundle
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
