'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from '@/components/ui/sonner'
import { uploadDirectGCSFile } from '@/lib/client-gcs-upload'
import {
  Layers,
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Palette,
  Gem,
  Tag,
  Maximize2,
  ExternalLink,
} from 'lucide-react'

export type BoqMaterialCategoryType = 'BOARD' | 'PRELAMINATED' | 'HPL' | 'DOCU'

export interface BoqBoardFinishItem {
  id: string
  type: BoqMaterialCategoryType
  name: string
  category: string
  code: string
  thickness: string
  sheetSize: string
  description: string
  imageUrl?: string | null
  isActive: boolean
  serialNo: number
}

const TABS: { key: BoqMaterialCategoryType; label: string; icon: React.ComponentType<{ className?: string }>; description: string }[] = [
  { key: 'BOARD', label: 'Boards', icon: Layers, description: 'Core substrates, Plywood, MDF, Particle & Waterproof Boards' },
  { key: 'PRELAMINATED', label: 'Prelaminate', icon: Sparkles, description: 'Factory prelaminated shades & surface finishes' },
  { key: 'HPL', label: 'HPL', icon: Gem, description: 'High Pressure Laminates, brand lines & finish codes' },
  { key: 'DOCU', label: 'Docu (Duco)', icon: Palette, description: 'Duco paint coats, glossy, soft matt & architectural colors' },
]

export function BoqBoardFinishCatalogSettings() {
  const [activeTab, setActiveTab] = useState<BoqMaterialCategoryType>('BOARD')
  const [items, setItems] = useState<BoqBoardFinishItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<BoqBoardFinishItem | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    type: 'BOARD' as BoqMaterialCategoryType,
    name: '',
    category: '',
    code: '',
    thickness: '',
    sheetSize: '',
    description: '',
    imageUrl: '',
  })

  // Load items from API
  const loadItems = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/boq/board-finishes')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setItems(data.items)
      } else {
        toast.error(data.error || 'Failed to load catalog items')
      }
    } catch {
      toast.error('Network error loading catalog items')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  // Filtered items for current active tab
  const itemsForActiveTab = useMemo(() => {
    return items.filter((item) => item.type === activeTab)
  }, [items, activeTab])

  // Category options for filter pills
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    itemsForActiveTab.forEach((item) => {
      if (item.category?.trim()) cats.add(item.category.trim())
    })
    return ['ALL', ...Array.from(cats).sort()]
  }, [itemsForActiveTab])

  // Filtered and searched items
  const displayedItems = useMemo(() => {
    return itemsForActiveTab.filter((item) => {
      const matchesCategory =
        selectedCategoryFilter === 'ALL' || item.category === selectedCategoryFilter
      const q = searchQuery.toLowerCase().trim()
      if (!q) return matchesCategory
      const matchesSearch =
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.thickness.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      return matchesCategory && matchesSearch
    })
  }, [itemsForActiveTab, selectedCategoryFilter, searchQuery])

  // Reset category filter on tab switch
  const handleTabChange = (tab: BoqMaterialCategoryType) => {
    setActiveTab(tab)
    setSelectedCategoryFilter('ALL')
    setSearchQuery('')
  }

  // Open add dialog
  const handleOpenAdd = () => {
    setFormData({
      type: activeTab,
      name: '',
      category: '',
      code: '',
      thickness: activeTab === 'BOARD' ? '18mm, 16mm, 12mm' : activeTab === 'HPL' ? '1mm' : '',
      sheetSize: activeTab === 'BOARD' ? "8' x 4'" : '',
      description: '',
      imageUrl: '',
    })
    setIsAddOpen(true)
  }

  // Open edit dialog
  const handleOpenEdit = (item: BoqBoardFinishItem) => {
    setActiveItem(item)
    setFormData({
      type: item.type,
      name: item.name,
      category: item.category || '',
      code: item.code || '',
      thickness: item.thickness || '',
      sheetSize: item.sheetSize || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
    })
    setIsEditOpen(true)
  }

  // Open delete confirm dialog
  const handleOpenDelete = (item: BoqBoardFinishItem) => {
    setActiveItem(item)
    setIsDeleteOpen(true)
  }

  // Image upload handler
  const handleImageUpload = async (file: File) => {
    setUploadingImage(true)
    try {
      const owner = formData.name
        ? formData.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `boq-${formData.type.toLowerCase()}`
      const result = await uploadDirectGCSFile({
        file,
        context: 'boq-item',
        ownerId: owner,
      })
      if (result?.url) {
        setFormData((prev) => ({ ...prev, imageUrl: result.url }))
        toast.success('Swatch photo uploaded successfully')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  // Save new item
  const handleSaveAdd = async () => {
    if (!formData.name.trim()) {
      toast.error('Item name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/boq/board-finishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.success && data.item) {
        toast.success(`${formData.name} added successfully`)
        setItems((prev) => [...prev, data.item])
        setIsAddOpen(false)
      } else {
        toast.error(data.error || 'Failed to add item')
      }
    } catch {
      toast.error('Network error saving item')
    } finally {
      setSubmitting(false)
    }
  }

  // Update item
  const handleSaveEdit = async () => {
    if (!activeItem) return
    if (!formData.name.trim()) {
      toast.error('Item name is required')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/boq/board-finishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeItem.id, ...formData }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        toast.success(`${formData.name} updated successfully`)
        setItems((prev) => prev.map((item) => (item.id === activeItem.id ? data.item : item)))
        setIsEditOpen(false)
      } else {
        toast.error(data.error || 'Failed to update item')
      }
    } catch {
      toast.error('Network error updating item')
    } finally {
      setSubmitting(false)
    }
  }

  // Delete item
  const handleConfirmDelete = async () => {
    if (!activeItem) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/boq/board-finishes?id=${encodeURIComponent(activeItem.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`${activeItem.name} deleted`)
        setItems((prev) => prev.filter((item) => item.id !== activeItem.id))
        setIsDeleteOpen(false)
      } else {
        toast.error(data.error || 'Failed to delete item')
      }
    } catch {
      toast.error('Network error deleting item')
    } finally {
      setSubmitting(false)
    }
  }

  // Item counts per tab
  const counts = useMemo(() => {
    return {
      BOARD: items.filter((i) => i.type === 'BOARD').length,
      PRELAMINATED: items.filter((i) => i.type === 'PRELAMINATED').length,
      HPL: items.filter((i) => i.type === 'HPL').length,
      DOCU: items.filter((i) => i.type === 'DOCU').length,
    }
  }, [items])

  return (
    <Card className="border border-border/80 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Requisition Materials & Finish Catalog
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground mt-1">
              Configure and maintain boards, prelaminated shades, HPL codes, and docu paint finishes used across BOQ requisitions.
            </CardDescription>
          </div>

          <Button onClick={handleOpenAdd} className="gap-2 shadow-sm shrink-0">
            <Plus className="h-4 w-4" />
            Add {TABS.find((t) => t.key === activeTab)?.label}
          </Button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-4">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isSelected = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                    : 'border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-md ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-background border text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-sm font-semibold truncate leading-tight">{tab.label}</div>
                    <div className="text-[11px] opacity-75 truncate">{tab.key === 'DOCU' ? 'Duco Paint' : tab.label}</div>
                  </div>
                </div>
                <Badge
                  variant={isSelected ? 'default' : 'secondary'}
                  className="ml-2 text-xs font-mono font-medium shrink-0"
                >
                  {counts[tab.key]}
                </Badge>
              </button>
            )
          })}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${TABS.find((t) => t.key === activeTab)?.label} by name, code, thickness...`}
              className="pl-9 h-9 text-xs"
            />
          </div>

          {availableCategories.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
                    selectedCategoryFilter === cat
                      ? 'bg-foreground text-background'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  {cat === 'ALL' ? 'All Groups' : cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-xs">Loading {TABS.find((t) => t.key === activeTab)?.label} catalog...</span>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="text-center py-14 border border-dashed rounded-lg bg-muted/20">
            <div className="inline-flex p-3 rounded-full bg-muted/60 mb-2 text-muted-foreground">
              {React.createElement(TABS.find((t) => t.key === activeTab)?.icon || Layers, { className: 'h-6 w-6' })}
            </div>
            <p className="text-sm font-medium text-foreground">No items found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No ${TABS.find((t) => t.key === activeTab)?.label.toLowerCase()} matching "${searchQuery}".`
                : `No items listed under this category yet. Click the button below to add one.`}
            </p>
            <Button onClick={handleOpenAdd} size="sm" variant="outline" className="mt-4 gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Add New {TABS.find((t) => t.key === activeTab)?.label}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {displayedItems.map((item) => (
              <div
                key={item.id}
                className="group relative border border-border/70 hover:border-primary/50 bg-card rounded-lg p-3.5 transition-all shadow-sm hover:shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {item.imageUrl ? (
                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative h-10 w-10 rounded border overflow-hidden shrink-0 bg-muted hover:opacity-80 transition-opacity"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="h-10 w-10 rounded border bg-muted/60 flex items-center justify-center shrink-0 text-muted-foreground">
                          {item.type === 'BOARD' && <Layers className="h-5 w-5" />}
                          {item.type === 'PRELAMINATED' && <Sparkles className="h-5 w-5" />}
                          {item.type === 'HPL' && <Gem className="h-5 w-5" />}
                          {item.type === 'DOCU' && <Palette className="h-5 w-5" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate leading-tight">
                          {item.name}
                        </h4>
                        {item.category && (
                          <span className="text-[11px] text-muted-foreground truncate block">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit Item"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenDelete(item)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Badges / specs */}
                  <div className="flex flex-wrap gap-1.5 my-2">
                    {item.code && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-muted/40">
                        Code: {item.code}
                      </Badge>
                    )}
                    {item.thickness && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                        Thick: {item.thickness}
                      </Badge>
                    )}
                    {item.sheetSize && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
                        Size: {item.sheetSize}
                      </Badge>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="font-mono text-[10px] opacity-60">#{item.serialNo}</span>
                  <span className="font-medium">
                    {item.type === 'BOARD'
                      ? 'Base Board Substrate'
                      : item.type === 'PRELAMINATED'
                      ? 'Prelam Finish'
                      : item.type === 'HPL'
                      ? 'HPL Laminate'
                      : 'Docu Finish'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* ── ADD ITEM DIALOG ── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add {TABS.find((t) => t.key === formData.type)?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new material or finish option to the BOQ catalog.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Catalog Section</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type: t.key }))}
                    className={`py-1.5 px-2 rounded border text-center transition-all ${
                      formData.type === t.key
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">
                {formData.type === 'BOARD'
                  ? 'Board Name *'
                  : formData.type === 'PRELAMINATED'
                  ? 'Shade / Option Name *'
                  : formData.type === 'HPL'
                  ? 'HPL Brand / Code Name *'
                  : 'Docu Finish / Color Name *'}
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={
                  formData.type === 'BOARD'
                    ? 'e.g. MR MDF Architect Grade Board'
                    : formData.type === 'PRELAMINATED'
                    ? 'e.g. Champagne Gold'
                    : formData.type === 'HPL'
                    ? 'e.g. Luxury 8193'
                    : 'e.g. Soft matt'
                }
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Category / Group</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  placeholder={
                    formData.type === 'BOARD'
                      ? 'e.g. Plywood Varieties'
                      : formData.type === 'PRELAMINATED'
                      ? 'e.g. Super Matt'
                      : formData.type === 'HPL'
                      ? 'e.g. Luxury / Aromex'
                      : 'e.g. Docu Finish'
                  }
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Code / Variant</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. 8193, CG-01, SMT-2003"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Thickness</label>
                <Input
                  value={formData.thickness}
                  onChange={(e) => setFormData((prev) => ({ ...prev, thickness: e.target.value }))}
                  placeholder="e.g. 18mm, 16mm, 1mm"
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Sheet / Panel Size</label>
                <Input
                  value={formData.sheetSize}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sheetSize: e.target.value }))}
                  placeholder="e.g. 8' x 4'"
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Description & Specs</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Finish details, moisture grade, usage recommendations..."
                className="h-8 text-xs"
              />
            </div>

            {/* Swatch / Photo Upload */}
            <div>
              <label className="font-semibold block mb-1">Swatch / Photo (Optional)</label>
              <div className="flex items-center gap-2">
                {formData.imageUrl ? (
                  <div className="relative h-12 w-12 rounded border overflow-hidden shrink-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.imageUrl} alt="Swatch" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Photo
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                />
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="or paste image URL..."
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsAddOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveAdd} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT ITEM DIALOG ── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-primary" />
              Edit {activeItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Modify the specifications, code, or swatch image of this catalog item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <label className="font-semibold block mb-1">Catalog Section</label>
              <div className="grid grid-cols-4 gap-1.5">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type: t.key }))}
                    className={`py-1.5 px-2 rounded border text-center transition-all ${
                      formData.type === t.key
                        ? 'bg-primary text-primary-foreground border-primary font-semibold'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Item Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Category / Group</label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Code / Variant</label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold block mb-1">Thickness</label>
                <Input
                  value={formData.thickness}
                  onChange={(e) => setFormData((prev) => ({ ...prev, thickness: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Sheet / Panel Size</label>
                <Input
                  value={formData.sheetSize}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sheetSize: e.target.value }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold block mb-1">Description & Specs</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Swatch / Photo (Optional)</label>
              <div className="flex items-center gap-2">
                {formData.imageUrl ? (
                  <div className="relative h-12 w-12 rounded border overflow-hidden shrink-0 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={formData.imageUrl} alt="Swatch" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, imageUrl: '' }))}
                      className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                    className="gap-1.5 h-8 text-xs"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Upload Photo
                  </Button>
                )}
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  placeholder="or paste image URL..."
                  className="h-8 text-xs flex-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsEditOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRM DIALOG ── */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Item?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <span className="font-semibold text-foreground">{activeItem?.name}</span>? This item will no longer appear in future requisition builder selectors.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
