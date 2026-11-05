'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  HardHat,
  FolderKanban,
  Truck,
  PlusCircle,
  RefreshCw,
  MapPin,
  Phone,
  CheckCircle2,
  AlertTriangle,
  Eye,
  ExternalLink,
  Loader2,
  Wallet,
  ArrowRight,
  Upload,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

type DeliveryItem = {
  id: string
  leadId: string
  challanNo: string | null
  vendorName: string | null
  itemsSummary: string
  quantity: number | null
  unit: string | null
  deliveryDate: string
  condition: 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED'
  slipUrl: string | null
  notes: string | null
  lead: {
    id: string
    name: string
    location: string | null
    phone: string | null
  }
  receivedBy: {
    id: string
    fullName: string
  }
}

type Project = {
  id: string
  name: string
  location: string | null
  phone: string | null
  stage: string
}

export default function SiteEngineerDashboardPage() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [counts, setCounts] = useState({
    TOTAL: 0,
    GOOD: 0,
    PARTIAL: 0,
    DAMAGED: 0,
    REJECTED: 0,
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Log Delivery Modal
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [challanNo, setChallanNo] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [itemsSummary, setItemsSummary] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('Pcs')
  const [condition, setCondition] = useState<'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED'>('GOOD')
  const [slipUrl, setSlipUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [submittingDelivery, setSubmittingDelivery] = useState(false)

  // Slip Preview Modal
  const [previewSlipUrl, setPreviewSlipUrl] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/site-engineer/delivery')
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to load site data')
      setDeliveries(json.data.deliveries || [])
      setProjects(json.data.projects || [])
      setCounts(json.data.counts || { TOTAL: 0, GOOD: 0, PARTIAL: 0, DAMAGED: 0, REJECTED: 0 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error loading site data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSlipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingSlip(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('context', 'site-delivery-challan')

      const res = await fetch('/api/gcs/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.fileUrl) {
        setSlipUrl(json.fileUrl)
        toast.success('Challan slip uploaded successfully!')
      } else {
        toast.error('Upload succeeded but no URL returned')
      }
    } catch {
      toast.error('Failed to upload challan slip')
    } finally {
      setUploadingSlip(false)
    }
  }

  const handleDeliverySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLeadId) return toast.error('Please select a project site')
    if (!itemsSummary.trim()) return toast.error('Please enter material items summary')

    setSubmittingDelivery(true)
    try {
      const res = await fetch('/api/site-engineer/delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          challanNo: challanNo.trim() || undefined,
          vendorName: vendorName.trim() || undefined,
          itemsSummary: itemsSummary.trim(),
          quantity: quantity ? parseFloat(quantity) : undefined,
          unit,
          condition,
          slipUrl: slipUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Failed to log delivery')

      toast.success('Site delivery received and logged successfully!')
      setDeliveryModalOpen(false)
      // Reset form
      setSelectedLeadId('')
      setChallanNo('')
      setVendorName('')
      setItemsSummary('')
      setQuantity('')
      setUnit('Pcs')
      setCondition('GOOD')
      setSlipUrl('')
      setNotes('')
      fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to log delivery')
    } finally {
      setSubmittingDelivery(false)
    }
  }

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Site Execution</span>
            <span>/</span>
            <span className="text-foreground font-medium">Site Engineer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HardHat className="w-7 h-7 text-amber-600 shrink-0" />
            Site Engineer Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitor active construction sites, verify gate material deliveries, and submit travel conveyance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={refreshing}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button asChild size="sm" variant="secondary" className="text-xs gap-1.5">
            <Link href="/conveyance">
              <Wallet className="w-3.5 h-3.5 text-indigo-600" />
              Site Travel Conveyance
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => setDeliveryModalOpen(true)}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Receive Material Delivery
          </Button>
        </div>
      </div>

      {/* ── KPI Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Active Project Sites */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Active Project Sites
              </span>
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600">
                <FolderKanban className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-foreground">
              {projects.length}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Client execution & construction sites
            </p>
          </CardContent>
        </Card>

        {/* Total Deliveries Logged */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Site Deliveries Received
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600">
                <Truck className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-emerald-600">
              {counts.TOTAL}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Total material batches gate-checked
            </p>
          </CardContent>
        </Card>

        {/* In Good Condition */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Verified & Undamaged
              </span>
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-indigo-600">
              {counts.GOOD}
            </div>
            <p className="text-[11px] text-muted-foreground">
              100% matched challan quantity
            </p>
          </CardContent>
        </Card>

        {/* Discrepancies or Damage */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Issues / Defective
              </span>
              <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold font-mono text-rose-600">
              {counts.DAMAGED + counts.PARTIAL + counts.REJECTED}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Partial, broken, or rejected items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Two Column Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Deliveries (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="w-4 h-4 text-amber-600" />
                    Recent Site Material Deliveries
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Latest raw materials, hardware, and furniture delivered to project sites
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                  <Link href="/site-engineer/delivery">
                    View All <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center items-center p-12 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  Loading site deliveries...
                </div>
              ) : deliveries.length === 0 ? (
                <div className="p-12 text-center space-y-2">
                  <Truck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                  <h3 className="text-sm font-semibold">No material deliveries logged yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    When materials arrive at your site from vendors or procurement, click &quot;Receive Material Delivery&quot; to log the challan.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Site Project</th>
                        <th className="p-3">Challan / Vendor</th>
                        <th className="p-3">Material Summary</th>
                        <th className="p-3 text-center">Condition</th>
                        <th className="p-3 text-center">Slip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {deliveries.slice(0, 6).map((del) => (
                        <tr key={del.id} className="hover:bg-muted/30 transition">
                          <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                            {new Date(del.deliveryDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </td>

                          <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                            <div>{del.lead.name}</div>
                            {del.lead.location && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                                <MapPin className="w-2.5 h-2.5" />
                                {del.lead.location}
                              </div>
                            )}
                          </td>

                          <td className="p-3 whitespace-nowrap">
                            <div className="font-mono">{del.challanNo || 'No Challan #'}</div>
                            {del.vendorName && (
                              <div className="text-[10px] text-muted-foreground">
                                {del.vendorName}
                              </div>
                            )}
                          </td>

                          <td className="p-3 max-w-xs">
                            <div className="line-clamp-1 font-medium">{del.itemsSummary}</div>
                            {del.quantity && (
                              <div className="text-[10px] text-muted-foreground">
                                Qty: {del.quantity} {del.unit || 'Pcs'}
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                del.condition === 'GOOD'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : del.condition === 'PARTIAL'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {del.condition}
                            </Badge>
                          </td>

                          <td className="p-3 text-center whitespace-nowrap">
                            {del.slipUrl ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1.5 text-[10px] text-indigo-600 gap-1"
                                onClick={() => setPreviewSlipUrl(del.slipUrl)}
                              >
                                <Eye className="w-3 h-3" />
                                Slip
                              </Button>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Active Sites (1 col) */}
        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-blue-600" />
                    Site Projects
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Locations currently under execution
                  </CardDescription>
                </div>
                <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
                  <Link href="/site-engineer/projects">
                    All Sites <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-3 space-y-2.5">
              {projects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-lg border border-border/60 hover:border-border transition bg-card space-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-xs text-foreground truncate">
                      {p.name}
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {p.stage.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  {p.location && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                      <span className="truncate">{p.location}</span>
                    </div>
                  )}

                  {p.phone && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 shrink-0 text-muted-foreground" />
                      <span>{p.phone}</span>
                    </div>
                  )}

                  <div className="pt-1.5 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2 gap-1 text-amber-700 dark:text-amber-300"
                      onClick={() => {
                        setSelectedLeadId(p.id)
                        setDeliveryModalOpen(true)
                      }}
                    >
                      <PlusCircle className="w-3 h-3" />
                      Log Delivery
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Log Delivery Dialog ── */}
      <Dialog open={deliveryModalOpen} onOpenChange={setDeliveryModalOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              Receive Material Delivery at Site
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Record incoming materials, challan number, quantity, condition check, and delivery slip photo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDeliverySubmit} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label className="text-xs">Project Site *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select project site" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.name} {p.location ? `(${p.location})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Delivery Challan / Memo No.</Label>
                <Input
                  placeholder="e.g. CH-8912"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Supplier / Vendor Name</Label>
                <Input
                  placeholder="e.g. Akij Board Center"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Material Items Summary *</Label>
              <Textarea
                placeholder="e.g. 25 Pcs 18mm Gorjon Plywood, 5 boxes Hafele soft-close hinges, 2 cans Fevicol glue"
                value={itemsSummary}
                onChange={(e) => setItemsSummary(e.target.value)}
                rows={2}
                required
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantity</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 25"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unit</Label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pcs" className="text-xs">Pcs</SelectItem>
                    <SelectItem value="Sqft" className="text-xs">Sqft</SelectItem>
                    <SelectItem value="Boxes" className="text-xs">Boxes</SelectItem>
                    <SelectItem value="Bundles" className="text-xs">Bundles</SelectItem>
                    <SelectItem value="Kg" className="text-xs">Kg</SelectItem>
                    <SelectItem value="Liters" className="text-xs">Liters</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Condition Check</Label>
                <Select
                  value={condition}
                  onValueChange={(val) => setCondition(val as 'GOOD' | 'PARTIAL' | 'DAMAGED' | 'REJECTED')}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD" className="text-xs">Good & Undamaged</SelectItem>
                    <SelectItem value="PARTIAL" className="text-xs">Partial Delivery</SelectItem>
                    <SelectItem value="DAMAGED" className="text-xs">Damaged / Defective</SelectItem>
                    <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Challan / Delivery Slip Photo</Label>
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 border rounded-md cursor-pointer text-xs hover:bg-muted/40 w-full truncate border-dashed">
                {uploadingSlip ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="truncate">
                  {slipUrl ? 'Slip Photo Uploaded ✓' : 'Upload photo of delivery challan'}
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleSlipUpload}
                  disabled={uploadingSlip}
                />
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Site Remarks / Notes</Label>
              <Input
                placeholder="e.g. Stored in 2nd floor bedroom safe from moisture"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeliveryModalOpen(false)}
                disabled={submittingDelivery}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingDelivery || uploadingSlip}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {submittingDelivery ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm Gate Receipt'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Slip Preview Dialog ── */}
      <Dialog open={Boolean(previewSlipUrl)} onOpenChange={(open) => !open && setPreviewSlipUrl(null)}>
        <DialogContent className="sm:max-w-[650px] p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Challan / Delivery Slip</span>
              {previewSlipUrl && (
                <a
                  href={previewSlipUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Open Original <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="rounded-lg overflow-hidden border bg-muted/20 flex items-center justify-center min-h-[300px] max-h-[70vh]">
            {previewSlipUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={previewSlipUrl}
                alt="Delivery Slip"
                className="max-h-[68vh] w-auto object-contain mx-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
