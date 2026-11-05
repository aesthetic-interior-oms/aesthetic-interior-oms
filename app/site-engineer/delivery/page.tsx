'use client'

import React, { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Truck,
  PlusCircle,
  RefreshCw,
  Search,
  MapPin,
  Eye,
  ExternalLink,
  Loader2,
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
}

export default function SiteEngineerDeliveryPageWrapper() {
  return (
    <Suspense fallback={<div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
      <SiteEngineerDeliveryPage />
    </Suspense>
  )
}

function SiteEngineerDeliveryPage() {
  const searchParams = useSearchParams()
  const initialLeadId = searchParams.get('leadId') || ''

  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [selectedProjectFilter, setSelectedProjectFilter] = useState(initialLeadId)
  const [conditionFilter, setConditionFilter] = useState('ALL')

  // Log Delivery Modal
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId)
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
      if (!json.success) throw new Error(json.error || 'Failed to load site deliveries')
      setDeliveries(json.data.deliveries || [])
      setProjects(json.data.projects || [])
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

      toast.success('Site delivery logged successfully!')
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

  const filteredDeliveries = deliveries.filter((del) => {
    const matchesProject = !selectedProjectFilter || selectedProjectFilter === 'ALL' || del.leadId === selectedProjectFilter
    const matchesCondition = conditionFilter === 'ALL' || del.condition === conditionFilter
    const matchesSearch =
      !search ||
      (del.challanNo && del.challanNo.toLowerCase().includes(search.toLowerCase())) ||
      (del.vendorName && del.vendorName.toLowerCase().includes(search.toLowerCase())) ||
      del.itemsSummary.toLowerCase().includes(search.toLowerCase()) ||
      del.lead.name.toLowerCase().includes(search.toLowerCase())

    return matchesProject && matchesCondition && matchesSearch
  })

  return (
    <div className="w-full p-4 sm:p-6 lg:p-8 space-y-6 min-h-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/site-engineer/dashboard" className="hover:text-foreground">
              Site Engineer
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Material Deliveries</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="w-7 h-7 text-amber-600 shrink-0" />
            Site Material Receiving & Gate Checks
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Log incoming challans, verify quantity & physical condition, and store gate-check proofs.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          <Button
            size="sm"
            onClick={() => {
              if (selectedProjectFilter && selectedProjectFilter !== 'ALL') {
                setSelectedLeadId(selectedProjectFilter)
              }
              setDeliveryModalOpen(true)
            }}
            className="text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Receive Delivery
          </Button>
        </div>
      </div>

      {/* ── Filter & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search challan, vendor, material..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Project Filter */}
          <Select value={selectedProjectFilter || 'ALL'} onValueChange={setSelectedProjectFilter}>
            <SelectTrigger className="text-xs h-8 w-[200px]">
              <SelectValue placeholder="All Project Sites" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="ALL" className="text-xs">All Project Sites</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Condition Filter */}
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="text-xs h-8 w-[140px]">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">All Conditions</SelectItem>
              <SelectItem value="GOOD" className="text-xs">Good & Undamaged</SelectItem>
              <SelectItem value="PARTIAL" className="text-xs">Partial Delivery</SelectItem>
              <SelectItem value="DAMAGED" className="text-xs">Damaged / Defect</SelectItem>
              <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Deliveries Table ── */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            Material Gate Logs ({filteredDeliveries.length})
          </CardTitle>
          <CardDescription className="text-xs">
            Complete gate-check ledger with challans, materials, condition, and receiver sign-off
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center p-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Loading deliveries...
            </div>
          ) : filteredDeliveries.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Truck className="w-10 h-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-sm font-semibold">No material deliveries found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No delivery logs match your filter criteria. Click &quot;Receive Delivery&quot; to log incoming materials.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/40 uppercase tracking-wider text-muted-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">Delivery Date</th>
                    <th className="p-3">Project Site</th>
                    <th className="p-3">Challan / Memo</th>
                    <th className="p-3">Supplier / Vendor</th>
                    <th className="p-3">Materials Summary</th>
                    <th className="p-3 text-right">Qty</th>
                    <th className="p-3 text-center">Condition</th>
                    <th className="p-3 text-center">Slip Proof</th>
                    <th className="p-3">Received By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredDeliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-muted/30 transition">
                      {/* Date */}
                      <td className="p-3 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(del.deliveryDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Project */}
                      <td className="p-3 font-semibold text-foreground whitespace-nowrap">
                        <div>{del.lead.name}</div>
                        {del.lead.location && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-normal">
                            <MapPin className="w-2.5 h-2.5" />
                            {del.lead.location}
                          </div>
                        )}
                      </td>

                      {/* Challan No */}
                      <td className="p-3 font-mono font-medium whitespace-nowrap">
                        {del.challanNo || <span className="text-muted-foreground/50">N/A</span>}
                      </td>

                      {/* Vendor */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {del.vendorName || <span className="text-muted-foreground/50">—</span>}
                      </td>

                      {/* Items */}
                      <td className="p-3 max-w-xs">
                        <div className="font-medium text-foreground">{del.itemsSummary}</div>
                        {del.notes && (
                          <div className="text-[10px] text-muted-foreground italic mt-0.5">
                            Note: {del.notes}
                          </div>
                        )}
                      </td>

                      {/* Qty */}
                      <td className="p-3 text-right font-mono font-bold whitespace-nowrap">
                        {del.quantity ? `${del.quantity} ${del.unit || 'Pcs'}` : '—'}
                      </td>

                      {/* Condition */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            del.condition === 'GOOD'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : del.condition === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : del.condition === 'DAMAGED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-red-100 text-red-800 border-red-300'
                          }`}
                        >
                          {del.condition}
                        </Badge>
                      </td>

                      {/* Slip Proof */}
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

                      {/* Received By */}
                      <td className="p-3 text-muted-foreground whitespace-nowrap">
                        {del.receivedBy.fullName}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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
