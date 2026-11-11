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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/components/ui/sonner'
import { uploadDirectGCSFile } from '@/lib/client-gcs-upload'
import {
  Sparkles,
  Flame,
  Search,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
  ExternalLink,
  Package,
} from 'lucide-react'

export interface AccessoryCatalogItem {
  id: string
  name: string
  category: string
  itemCode: string
  defaultUnit: string
  imageUrl?: string | null
  serialNo?: number
  isActive?: boolean
}

export interface ApplianceCatalogItem {
  id: string
  name: string
  category: string
  brandModelCode: string
  dimW?: string
  dimD?: string
  dimH?: string
  cabinetNicheCutOutSize?: string
  defaultUnitPrice?: string
  defaultUnit?: string
  imageUrl?: string | null
  serialNo?: number
  isActive?: boolean
}

const ACCESSORY_CATEGORIES = ['All', 'Kitchen', 'Closet', 'Cabinet', 'Hardware']
const APPLIANCE_CATEGORIES = [
  'All',
  'Cooking',
  'Ventilation',
  'Sink & Wet Area',
  'Refrigeration',
  'Oven & Baking',
  'Water Purifier',
  'Dishwashing',
]

export function AccessoriesAppliancesCatalogSettings() {
  const [activeCatalog, setActiveCatalog] = useState<'accessories' | 'appliances'>('accessories')

  // Accessories State
  const [accessories, setAccessories] = useState<AccessoryCatalogItem[]>([])
  const [loadingAccessories, setLoadingAccessories] = useState(true)
  const [selectedAccCategory, setSelectedAccCategory] = useState('All')
  const [searchAcc, setSearchAcc] = useState('')

  // Appliances State
  const [appliances, setAppliances] = useState<ApplianceCatalogItem[]>([])
  const [loadingAppliances, setLoadingAppliances] = useState(true)
  const [selectedAppCategory, setSelectedAppCategory] = useState('All')
  const [searchApp, setSearchApp] = useState('')

  // Modals
  const [isAddAccOpen, setIsAddAccOpen] = useState(false)
  const [isEditAccOpen, setIsEditAccOpen] = useState(false)
  const [editingAcc, setEditingAcc] = useState<AccessoryCatalogItem | null>(null)

  const [isAddAppOpen, setIsAddAppOpen] = useState(false)
  const [isEditAppOpen, setIsEditAppOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<ApplianceCatalogItem | null>(null)

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null)

  // Delete Confirm Modal
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    type: 'accessory' | 'appliance'
  } | null>(null)

  // Accessory Form state
  const [accForm, setAccForm] = useState({
    name: '',
    category: 'Kitchen',
    itemCode: '',
    defaultUnit: 'Pcs',
    imageUrl: '',
  })
  const [accUploading, setAccUploading] = useState(false)
  const [accSaving, setAccSaving] = useState(false)
  const accFileInputRef = useRef<HTMLInputElement>(null)

  // Appliance Form state
  const [appForm, setAppForm] = useState({
    name: '',
    category: 'Cooking',
    brandModelCode: '',
    dimW: '',
    dimD: '',
    dimH: '',
    cabinetNicheCutOutSize: '',
    defaultUnitPrice: '',
    defaultUnit: 'Nos',
    imageUrl: '',
  })
  const [appUploading, setAppUploading] = useState(false)
  const [appSaving, setAppSaving] = useState(false)
  const appFileInputRef = useRef<HTMLInputElement>(null)

  // Load Accessories
  const loadAccessories = async () => {
    setLoadingAccessories(true)
    try {
      const res = await fetch('/api/boq/saved-accessories')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setAccessories(data.items)
      }
    } catch {
      toast.error('Failed to load saved accessories')
    } finally {
      setLoadingAccessories(false)
    }
  }

  // Load Appliances
  const loadAppliances = async () => {
    setLoadingAppliances(true)
    try {
      const res = await fetch('/api/boq/saved-appliances')
      const data = await res.json()
      if (data.success && Array.isArray(data.items)) {
        setAppliances(data.items)
      }
    } catch {
      toast.error('Failed to load saved appliances')
    } finally {
      setLoadingAppliances(false)
    }
  }

  useEffect(() => {
    loadAccessories()
    loadAppliances()
  }, [])

  // Upload handler for accessories
  const handleUploadAccImage = async (file: File) => {
    setAccUploading(true)
    try {
      const result = await uploadDirectGCSFile({
        file,
        context: 'boq-item',
        ownerId: accForm.name ? accForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'accessory',
      })
      if (result?.url) {
        setAccForm((prev) => ({ ...prev, imageUrl: result.url }))
        toast.success('Image uploaded successfully')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setAccUploading(false)
    }
  }

  // Upload handler for appliances
  const handleUploadAppImage = async (file: File) => {
    setAppUploading(true)
    try {
      const result = await uploadDirectGCSFile({
        file,
        context: 'boq-item',
        ownerId: appForm.name ? appForm.name.toLowerCase().replace(/[^a-z0-9]/g, '-') : 'appliance',
      })
      if (result?.url) {
        setAppForm((prev) => ({ ...prev, imageUrl: result.url }))
        toast.success('Image uploaded successfully')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Image upload failed')
    } finally {
      setAppUploading(false)
    }
  }

  // Save new accessory
  const handleCreateAccessory = async () => {
    if (!accForm.name.trim()) {
      toast.error('Accessory name is required')
      return
    }
    setAccSaving(true)
    try {
      const res = await fetch('/api/boq/saved-accessories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accForm),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setAccessories((prev) => [...prev, data.item])
        toast.success('New accessory created with permanent image!')
        setIsAddAccOpen(false)
        setAccForm({ name: '', category: 'Kitchen', itemCode: '', defaultUnit: 'Pcs', imageUrl: '' })
      } else {
        toast.error(data.error || 'Failed to save accessory')
      }
    } catch {
      toast.error('Error saving accessory')
    } finally {
      setAccSaving(false)
    }
  }

  // Update existing accessory
  const handleUpdateAccessory = async () => {
    if (!editingAcc || !accForm.name.trim()) return
    setAccSaving(true)
    try {
      const res = await fetch('/api/boq/saved-accessories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAcc.id,
          ...accForm,
        }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setAccessories((prev) => prev.map((it) => (it.id === data.item.id ? data.item : it)))
        toast.success('Accessory updated successfully')
        setIsEditAccOpen(false)
        setEditingAcc(null)
      } else {
        toast.error(data.error || 'Failed to update accessory')
      }
    } catch {
      toast.error('Error updating accessory')
    } finally {
      setAccSaving(false)
    }
  }

  // Save new appliance
  const handleCreateAppliance = async () => {
    if (!appForm.name.trim()) {
      toast.error('Appliance name is required')
      return
    }
    setAppSaving(true)
    try {
      const res = await fetch('/api/boq/saved-appliances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appForm),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setAppliances((prev) => [...prev, data.item])
        toast.success('New appliance created with permanent image!')
        setIsAddAppOpen(false)
        setAppForm({
          name: '',
          category: 'Cooking',
          brandModelCode: '',
          dimW: '',
          dimD: '',
          dimH: '',
          cabinetNicheCutOutSize: '',
          defaultUnitPrice: '',
          defaultUnit: 'Nos',
          imageUrl: '',
        })
      } else {
        toast.error(data.error || 'Failed to save appliance')
      }
    } catch {
      toast.error('Error saving appliance')
    } finally {
      setAppSaving(false)
    }
  }

  // Update existing appliance
  const handleUpdateAppliance = async () => {
    if (!editingApp || !appForm.name.trim()) return
    setAppSaving(true)
    try {
      const res = await fetch('/api/boq/saved-appliances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingApp.id,
          ...appForm,
        }),
      })
      const data = await res.json()
      if (data.success && data.item) {
        setAppliances((prev) => prev.map((it) => (it.id === data.item.id ? data.item : it)))
        toast.success('Appliance updated successfully')
        setIsEditAppOpen(false)
        setEditingApp(null)
      } else {
        toast.error(data.error || 'Failed to update appliance')
      }
    } catch {
      toast.error('Error updating appliance')
    } finally {
      setAppSaving(false)
    }
  }

  // Delete item
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const endpoint =
        deleteTarget.type === 'accessory'
          ? `/api/boq/saved-accessories?id=${deleteTarget.id}`
          : `/api/boq/saved-appliances?id=${deleteTarget.id}`
      const res = await fetch(endpoint, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        if (deleteTarget.type === 'accessory') {
          setAccessories((prev) => prev.filter((it) => it.id !== deleteTarget.id))
        } else {
          setAppliances((prev) => prev.filter((it) => it.id !== deleteTarget.id))
        }
        toast.success(`Removed ${deleteTarget.name} from catalog`)
      } else {
        toast.error(data.error || 'Failed to remove item')
      }
    } catch {
      toast.error('Error deleting item')
    } finally {
      setDeleteTarget(null)
    }
  }

  // Filtered Accessories
  const filteredAccessories = useMemo(() => {
    return accessories.filter((item) => {
      const matchesCat =
        selectedAccCategory === 'All' ||
        (item.category || '').toLowerCase() === selectedAccCategory.toLowerCase()
      const q = searchAcc.trim().toLowerCase()
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.itemCode || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [accessories, selectedAccCategory, searchAcc])

  // Filtered Appliances
  const filteredAppliances = useMemo(() => {
    return appliances.filter((item) => {
      const matchesCat =
        selectedAppCategory === 'All' ||
        (item.category || '').toLowerCase() === selectedAppCategory.toLowerCase()
      const q = searchApp.trim().toLowerCase()
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        (item.brandModelCode || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      return matchesCat && matchesSearch
    })
  }, [appliances, selectedAppCategory, searchApp])

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-foreground">Accessories & Appliances Library</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Configure lifetime catalog items with persistent images, codes, and specifications for BOQ and quotations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeCatalog === 'accessories' ? (
              <Button
                onClick={() => {
                  setAccForm({
                    name: '',
                    category: 'Kitchen',
                    itemCode: '',
                    defaultUnit: 'Pcs',
                    imageUrl: '',
                  })
                  setIsAddAccOpen(true)
                }}
                className="bg-pink-600 hover:bg-pink-700 text-white gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add New Accessory
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setAppForm({
                    name: '',
                    category: 'Cooking',
                    brandModelCode: '',
                    dimW: '',
                    dimD: '',
                    dimH: '',
                    cabinetNicheCutOutSize: '',
                    defaultUnitPrice: '',
                    defaultUnit: 'Nos',
                    imageUrl: '',
                  })
                  setIsAddAppOpen(true)
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white gap-2 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Add New Appliance
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs
        value={activeCatalog}
        onValueChange={(v) => setActiveCatalog(v as 'accessories' | 'appliances')}
        className="w-full space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
          <TabsList className="bg-muted/60 p-1">
            <TabsTrigger value="accessories" className="gap-2 px-4 py-2 font-medium">
              <Sparkles className="w-4 h-4 text-pink-500" />
              <span>Accessories</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {accessories.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="appliances" className="gap-2 px-4 py-2 font-medium">
              <Flame className="w-4 h-4 text-teal-500" />
              <span>Appliances</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {appliances.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* Quick search input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={
                activeCatalog === 'accessories'
                  ? 'Search accessories...'
                  : 'Search appliances...'
              }
              value={activeCatalog === 'accessories' ? searchAcc : searchApp}
              onChange={(e) =>
                activeCatalog === 'accessories'
                  ? setSearchAcc(e.target.value)
                  : setSearchApp(e.target.value)
              }
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* ─── ACCESSORIES CONTENT ─── */}
        <TabsContent value="accessories" className="space-y-4 m-0">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ACCESSORY_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedAccCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  selectedAccCategory === cat
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Accessories Grid */}
          {loadingAccessories ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
              <span className="text-sm">Loading saved accessories...</span>
            </div>
          ) : filteredAccessories.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
              <Package className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground text-sm">No accessories found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {searchAcc || selectedAccCategory !== 'All'
                  ? 'Try clearing your search or category filter.'
                  : 'Add your first saved accessory item with lifetime image.'}
              </p>
              <Button
                onClick={() => {
                  setAccForm({
                    name: '',
                    category: 'Kitchen',
                    itemCode: '',
                    defaultUnit: 'Pcs',
                    imageUrl: '',
                  })
                  setIsAddAccOpen(true)
                }}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Accessory
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAccessories.map((item) => (
                <div
                  key={item.id}
                  className="group bg-card border border-border/80 hover:border-pink-500/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  {/* Image Header */}
                  <div className="relative aspect-4/3 w-full bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/60">
                    {item.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({ url: item.imageUrl!, title: item.name })
                        }
                        className="w-full h-full relative cursor-zoom-in"
                        title="Click to view full image"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            View Image
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/50 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-1 text-muted-foreground/40" />
                        <span className="text-[11px] font-medium">No image attached</span>
                      </div>
                    )}

                    {/* Category pill on top of image */}
                    {item.category && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-xs text-pink-700 dark:text-pink-300 border border-pink-500/30 shadow-xs">
                        {item.category}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {item.itemCode && (
                          <span className="text-[11px] font-mono px-1.5 py-0.5 bg-muted rounded text-muted-foreground border border-border/60 truncate max-w-[160px]">
                            {item.itemCode}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground">
                          Unit: <strong className="text-foreground">{item.defaultUnit || 'Pcs'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingAcc(item)
                          setAccForm({
                            name: item.name,
                            category: item.category || 'Kitchen',
                            itemCode: item.itemCode || '',
                            defaultUnit: item.defaultUnit || 'Pcs',
                            imageUrl: item.imageUrl || '',
                          })
                          setIsEditAccOpen(true)
                        }}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            id: item.id,
                            name: item.name,
                            type: 'accessory',
                          })
                        }
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── APPLIANCES CONTENT ─── */}
        <TabsContent value="appliances" className="space-y-4 m-0">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {APPLIANCE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedAppCategory(cat)}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-all ${
                  selectedAppCategory === cat
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Appliances Grid */}
          {loadingAppliances ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
              <span className="text-sm">Loading saved appliances...</span>
            </div>
          ) : filteredAppliances.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
              <Flame className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground text-sm">No appliances found</h3>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {searchApp || selectedAppCategory !== 'All'
                  ? 'Try clearing your search or category filter.'
                  : 'Add your first saved appliance item with lifetime image and specs.'}
              </p>
              <Button
                onClick={() => {
                  setAppForm({
                    name: '',
                    category: 'Cooking',
                    brandModelCode: '',
                    dimW: '',
                    dimD: '',
                    dimH: '',
                    cabinetNicheCutOutSize: '',
                    defaultUnitPrice: '',
                    defaultUnit: 'Nos',
                    imageUrl: '',
                  })
                  setIsAddAppOpen(true)
                }}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Appliance
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAppliances.map((item) => (
                <div
                  key={item.id}
                  className="group bg-card border border-border/80 hover:border-teal-500/50 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                >
                  {/* Image Header */}
                  <div className="relative aspect-4/3 w-full bg-muted/40 flex items-center justify-center overflow-hidden border-b border-border/60">
                    {item.imageUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({ url: item.imageUrl!, title: item.name })
                        }
                        className="w-full h-full relative cursor-zoom-in"
                        title="Click to view full image"
                      >
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                            View Image
                          </span>
                        </div>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground/50 p-4 text-center">
                        <ImageIcon className="w-8 h-8 mb-1 text-muted-foreground/40" />
                        <span className="text-[11px] font-medium">No image attached</span>
                      </div>
                    )}

                    {/* Category pill */}
                    {item.category && (
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-background/90 backdrop-blur-xs text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-xs">
                        {item.category}
                      </span>
                    )}

                    {/* Default Price pill */}
                    {item.defaultUnitPrice && (
                      <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-600 text-white shadow-xs">
                        {item.defaultUnitPrice}
                      </span>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {item.name}
                      </h4>
                      {item.brandModelCode && (
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          {item.brandModelCode}
                        </p>
                      )}

                      {/* Dimensions & Cutout */}
                      {(item.dimW || item.dimD || item.dimH) && (
                        <div className="text-[11px] text-muted-foreground bg-muted/50 rounded px-2 py-1 flex items-center gap-1 font-mono">
                          <span>Dim:</span>
                          <span className="text-foreground font-semibold">
                            {item.dimW || '-'} × {item.dimD || '-'} × {item.dimH || '-'} mm
                          </span>
                        </div>
                      )}

                      {item.cabinetNicheCutOutSize && (
                        <p className="text-[10px] text-muted-foreground truncate" title={item.cabinetNicheCutOutSize}>
                          Cutout: <span className="text-foreground">{item.cabinetNicheCutOutSize}</span>
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingApp(item)
                          setAppForm({
                            name: item.name,
                            category: item.category || 'Cooking',
                            brandModelCode: item.brandModelCode || '',
                            dimW: item.dimW || '',
                            dimD: item.dimD || '',
                            dimH: item.dimH || '',
                            cabinetNicheCutOutSize: item.cabinetNicheCutOutSize || '',
                            defaultUnitPrice: item.defaultUnitPrice || '',
                            defaultUnit: item.defaultUnit || 'Nos',
                            imageUrl: item.imageUrl || '',
                          })
                          setIsEditAppOpen(true)
                        }}
                        className="h-7 px-2 text-muted-foreground hover:text-foreground gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setDeleteTarget({
                            id: item.id,
                            name: item.name,
                            type: 'appliance',
                          })
                        }
                        className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── ADD / EDIT ACCESSORY DIALOG ─── */}
      <Dialog
        open={isAddAccOpen || isEditAccOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddAccOpen(false)
            setIsEditAccOpen(false)
            setEditingAcc(null)
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-600" />
              {isEditAccOpen ? 'Edit Saved Accessory' : 'Add New Saved Accessory'}
            </DialogTitle>
            <DialogDescription>
              Configure accessory properties and attach a lifetime image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image Preview & Upload */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Accessory Image (Lifetime)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-lg border border-border bg-muted/40 relative flex items-center justify-center overflow-hidden shrink-0">
                  {accForm.imageUrl ? (
                    <>
                      <img
                        src={accForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setAccForm((p) => ({ ...p, imageUrl: '' }))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-0.5 rounded-full"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={accFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAccImage(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={accUploading}
                    onClick={() => accFileInputRef.current?.click()}
                    className="w-full gap-2 text-xs"
                  >
                    {accUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading to Storage...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        {accForm.imageUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </Button>

                  <Input
                    type="url"
                    placeholder="Or paste external image URL..."
                    value={accForm.imageUrl}
                    onChange={(e) =>
                      setAccForm((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Item Name */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Item Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Elevator Basket, Cutlery Tray..."
                value={accForm.name}
                onChange={(e) => setAccForm((p) => ({ ...p, name: e.target.value }))}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Category
                </label>
                <select
                  value={accForm.category}
                  onChange={(e) => setAccForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Kitchen">Kitchen</option>
                  <option value="Closet">Closet</option>
                  <option value="Cabinet">Cabinet</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Item Code */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Item Code / Model
                </label>
                <Input
                  placeholder="e.g. KIW-23, GLFA943B..."
                  value={accForm.itemCode}
                  onChange={(e) => setAccForm((p) => ({ ...p, itemCode: e.target.value }))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Default Unit */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Default Unit
              </label>
              <select
                value={accForm.defaultUnit}
                onChange={(e) => setAccForm((p) => ({ ...p, defaultUnit: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="Pcs">Pcs</option>
                <option value="Set">Set</option>
                <option value="Pair">Pair</option>
                <option value="Nos">Nos</option>
                <option value="Meter">Meter</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddAccOpen(false)
                setIsEditAccOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditAccOpen ? handleUpdateAccessory : handleCreateAccessory}
              disabled={accSaving || accUploading || !accForm.name.trim()}
              className="bg-pink-600 hover:bg-pink-700 text-white gap-2"
              size="sm"
            >
              {accSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {isEditAccOpen ? 'Save Changes' : 'Create Accessory'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ADD / EDIT APPLIANCE DIALOG ─── */}
      <Dialog
        open={isAddAppOpen || isEditAppOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddAppOpen(false)
            setIsEditAppOpen(false)
            setEditingApp(null)
          }
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-teal-600" />
              {isEditAppOpen ? 'Edit Saved Appliance' : 'Add New Saved Appliance'}
            </DialogTitle>
            <DialogDescription>
              Configure appliance specifications, cutout sizes, and attach a lifetime image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Image Preview & Upload */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">
                Appliance Image (Lifetime)
              </label>
              <div className="flex items-center gap-3">
                <div className="w-24 h-24 rounded-lg border border-border bg-muted/40 relative flex items-center justify-center overflow-hidden shrink-0">
                  {appForm.imageUrl ? (
                    <>
                      <img
                        src={appForm.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setAppForm((p) => ({ ...p, imageUrl: '' }))}
                        className="absolute top-1 right-1 bg-black/70 hover:bg-black text-white p-0.5 rounded-full"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  <input
                    ref={appFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleUploadAppImage(file)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={appUploading}
                    onClick={() => appFileInputRef.current?.click()}
                    className="w-full gap-2 text-xs"
                  >
                    {appUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Uploading to Storage...
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        {appForm.imageUrl ? 'Change Photo' : 'Upload Photo'}
                      </>
                    )}
                  </Button>

                  <Input
                    type="url"
                    placeholder="Or paste external image URL..."
                    value={appForm.imageUrl}
                    onChange={(e) =>
                      setAppForm((p) => ({ ...p, imageUrl: e.target.value }))
                    }
                    className="text-xs h-8"
                  />
                </div>
              </div>
            </div>

            {/* Appliance Name */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Appliance Name <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="e.g. Gas / Induction Hob, Kitchen Hood Chimney..."
                value={appForm.name}
                onChange={(e) => setAppForm((p) => ({ ...p, name: e.target.value }))}
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Category
                </label>
                <select
                  value={appForm.category}
                  onChange={(e) => setAppForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Cooking">Cooking</option>
                  <option value="Ventilation">Ventilation</option>
                  <option value="Sink & Wet Area">Sink & Wet Area</option>
                  <option value="Refrigeration">Refrigeration</option>
                  <option value="Oven & Baking">Oven & Baking</option>
                  <option value="Water Purifier">Water Purifier</option>
                  <option value="Dishwashing">Dishwashing</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Brand & Model */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Brand & Model Code
                </label>
                <Input
                  placeholder="e.g. HAFELE 538.66.759..."
                  value={appForm.brandModelCode}
                  onChange={(e) =>
                    setAppForm((p) => ({ ...p, brandModelCode: e.target.value }))
                  }
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Dimensions (W, D, H mm) */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Dimensions (mm)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Width (e.g. 860)"
                  value={appForm.dimW}
                  onChange={(e) => setAppForm((p) => ({ ...p, dimW: e.target.value }))}
                  className="text-xs h-9 font-mono"
                />
                <Input
                  placeholder="Depth (e.g. 520)"
                  value={appForm.dimD}
                  onChange={(e) => setAppForm((p) => ({ ...p, dimD: e.target.value }))}
                  className="text-xs h-9 font-mono"
                />
                <Input
                  placeholder="Height (e.g. 135)"
                  value={appForm.dimH}
                  onChange={(e) => setAppForm((p) => ({ ...p, dimH: e.target.value }))}
                  className="text-xs h-9 font-mono"
                />
              </div>
            </div>

            {/* Cabinet Niche / Cutout size */}
            <div>
              <label className="text-xs font-semibold text-foreground mb-1 block">
                Cabinet Niche / Cut-Out Size
              </label>
              <Input
                placeholder="e.g. W840 × D480 mm (Counter Cut) or 150mm Dia Wall Duct Hole..."
                value={appForm.cabinetNicheCutOutSize}
                onChange={(e) =>
                  setAppForm((p) => ({ ...p, cabinetNicheCutOutSize: e.target.value }))
                }
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Default Unit Price */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Default Unit Price
                </label>
                <Input
                  placeholder="e.g. ৳70,000"
                  value={appForm.defaultUnitPrice}
                  onChange={(e) =>
                    setAppForm((p) => ({ ...p, defaultUnitPrice: e.target.value }))
                  }
                  className="text-xs h-9"
                />
              </div>

              {/* Default Unit */}
              <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">
                  Default Unit
                </label>
                <select
                  value={appForm.defaultUnit}
                  onChange={(e) =>
                    setAppForm((p) => ({ ...p, defaultUnit: e.target.value }))
                  }
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="Nos">Nos</option>
                  <option value="Set">Set</option>
                  <option value="Pcs">Pcs</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAddAppOpen(false)
                setIsEditAppOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={isEditAppOpen ? handleUpdateAppliance : handleCreateAppliance}
              disabled={appSaving || appUploading || !appForm.name.trim()}
              className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
              size="sm"
            >
              {appSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  {isEditAppOpen ? 'Save Changes' : 'Create Appliance'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── IMAGE FULL PREVIEW MODAL ─── */}
      <Dialog open={Boolean(previewImage)} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-2 bg-card">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <h3 className="text-sm font-bold text-foreground truncate">
              {previewImage?.title}
            </h3>
            {previewImage?.url && (
              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                Open in new tab <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="p-2 flex items-center justify-center bg-black/5 dark:bg-black/30 rounded-lg max-h-[70vh] overflow-hidden">
            {previewImage?.url && (
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove &quot;{deleteTarget?.name}&quot; from the{' '}
              {deleteTarget?.type === 'accessory' ? 'accessories' : 'appliances'} catalog?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
