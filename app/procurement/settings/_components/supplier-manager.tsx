'use client'

import React, { useState, useTransition } from 'react'
import {
  Truck,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  Check,
  Power,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  createSupplierAction,
  updateSupplierAction,
  toggleSupplierStatusAction,
  deleteSupplierAction,
} from '../supplier-actions'

export type SupplierItem = {
  id: string
  supplierCode: string
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  address: string | null
  supplyCategory: string | null
  bankName: string | null
  bankAccountNumber: string | null
  routingNumber: string | null
  notes: string | null
  status: 'ACTIVE' | 'INACTIVE'
  createdAt: Date | string
}

interface SupplierManagerProps {
  initialSuppliers: SupplierItem[]
}

const CATEGORY_PRESETS = [
  'Boards & Panels',
  'Hardware & Fasteners',
  'Louvers & Fluted Panels',
  'Laminates & Veneer',
  'Adhesives & Chemicals',
  'Paints & Polish',
  'Glass & Mirror',
  'Electrical & Lights',
  'Fabrics & Upholstery',
  'General Procurement',
]

export function SupplierManager({ initialSuppliers }: SupplierManagerProps) {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(initialSuppliers)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [isPending, startTransition] = useTransition()

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null)

  // Form Fields
  const [formName, setFormName] = useState('')
  const [formCompanyName, setFormCompanyName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [formSupplyCategory, setFormSupplyCategory] = useState('')
  const [formBankName, setFormBankName] = useState('')
  const [formBankAccountNumber, setFormBankAccountNumber] = useState('')
  const [formRoutingNumber, setFormRoutingNumber] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const openCreateModal = () => {
    setEditingSupplier(null)
    setFormName('')
    setFormCompanyName('')
    setFormPhone('')
    setFormEmail('')
    setFormAddress('')
    setFormSupplyCategory('Boards & Panels')
    setFormBankName('')
    setFormBankAccountNumber('')
    setFormRoutingNumber('')
    setFormNotes('')
    setFormError(null)
    setIsModalOpen(true)
  }

  const openEditModal = (s: SupplierItem) => {
    setEditingSupplier(s)
    setFormName(s.name)
    setFormCompanyName(s.companyName || '')
    setFormPhone(s.phone || '')
    setFormEmail(s.email || '')
    setFormAddress(s.address || '')
    setFormSupplyCategory(s.supplyCategory || '')
    setFormBankName(s.bankName || '')
    setFormBankAccountNumber(s.bankAccountNumber || '')
    setFormRoutingNumber(s.routingNumber || '')
    setFormNotes(s.notes || '')
    setFormError(null)
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formName.trim()) {
      setFormError('Contact person or trade name is required')
      return
    }

    startTransition(async () => {
      if (editingSupplier) {
        const res = await updateSupplierAction({
          id: editingSupplier.id,
          name: formName,
          companyName: formCompanyName,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          supplyCategory: formSupplyCategory,
          bankName: formBankName,
          bankAccountNumber: formBankAccountNumber,
          routingNumber: formRoutingNumber,
          notes: formNotes,
        })

        if (!res.success) {
          setFormError(res.error || 'Failed to update supplier')
          return
        }

        setSuppliers((prev) =>
          prev.map((s) => (s.id === editingSupplier.id ? (res.supplier as unknown as SupplierItem) : s))
        )
      } else {
        const res = await createSupplierAction({
          name: formName,
          companyName: formCompanyName,
          phone: formPhone,
          email: formEmail,
          address: formAddress,
          supplyCategory: formSupplyCategory,
          bankName: formBankName,
          bankAccountNumber: formBankAccountNumber,
          routingNumber: formRoutingNumber,
          notes: formNotes,
        })

        if (!res.success) {
          setFormError(res.error || 'Failed to create supplier')
          return
        }

        setSuppliers((prev) => [res.supplier as unknown as SupplierItem, ...prev])
      }

      setIsModalOpen(false)
    })
  }

  const handleToggleStatus = (s: SupplierItem) => {
    startTransition(async () => {
      const res = await toggleSupplierStatusAction(s.id, s.status)
      if (res.success && res.supplier) {
        setSuppliers((prev) =>
          prev.map((item) => (item.id === s.id ? (res.supplier as unknown as SupplierItem) : item))
        )
      }
    })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this supplier?')) return
    startTransition(async () => {
      const res = await deleteSupplierAction(id)
      if (res.success) {
        setSuppliers((prev) => prev.filter((item) => item.id !== id))
      }
    })
  }

  // Filtered List
  const filteredSuppliers = suppliers.filter((s) => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = s.name.toLowerCase().includes(q)
      const matchComp = (s.companyName || '').toLowerCase().includes(q)
      const matchCode = s.supplierCode.toLowerCase().includes(q)
      const matchPhone = (s.phone || '').toLowerCase().includes(q)
      const matchCat = (s.supplyCategory || '').toLowerCase().includes(q)
      return matchName || matchComp || matchCode || matchPhone || matchCat
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* Supplier Section Header Bar */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <span>Material Suppliers Directory</span>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-medium border border-border bg-muted/40">
                  {suppliers.length} Registered
                </span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Suppliers added here will be available in the Billing Center purchase dropdowns for instant selection.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={openCreateModal}
            className="h-9 gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 text-xs font-semibold shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add New Supplier
          </Button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by supplier name, shop, or category..."
              className="pl-8 h-8 text-xs bg-background border-border"
            />
          </div>

          <div className="flex items-center gap-1 self-start sm:self-auto">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-md text-xs transition-colors ${
                  statusFilter === filter
                    ? 'bg-foreground text-background font-semibold'
                    : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filter === 'ALL' ? 'All' : filter === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="w-full rounded-xl border border-border bg-card shadow-xs overflow-hidden">
        {filteredSuppliers.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Truck className="w-8 h-8 text-muted-foreground/40 mx-auto" />
            <h3 className="text-xs font-semibold text-foreground">No suppliers found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? 'No suppliers match your search query.'
                : 'No material suppliers registered yet. Click "Add New Supplier" to get started.'}
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-muted/50 text-foreground font-semibold border-b border-border text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">Status</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Supplier &amp; Shop</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Contact Info</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Category / Scope</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Address / Location</th>
                  <th className="py-2.5 px-3 min-w-[140px]">Bank / Payment</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((s) => {
                  const isActive = s.status === 'ACTIVE'
                  return (
                    <tr
                      key={s.id}
                      className={`transition-colors hover:bg-muted/20 ${!isActive ? 'opacity-60 bg-muted/10' : ''}`}
                    >
                      {/* Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isActive
                              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'border-zinc-300 bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                          }`}
                        >
                          {isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </td>

                      {/* Supplier & Shop */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                            <span>{s.companyName || s.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground px-1 py-0.2 bg-muted rounded">
                              {s.supplierCode}
                            </span>
                          </div>
                          {s.companyName && (
                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <span>Contact: {s.name}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-3">
                        <div className="space-y-0.5 text-[11px]">
                          {s.phone ? (
                            <div className="text-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium font-mono">{s.phone}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {s.email && (
                            <div className="text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[130px]">{s.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3">
                        {s.supplyCategory ? (
                          <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-foreground text-[11px] font-medium border border-border">
                            {s.supplyCategory}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="py-3 px-3 text-muted-foreground">
                        {s.address ? (
                          <div className="flex items-start gap-1 text-[11px] line-clamp-2">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{s.address}</span>
                          </div>
                        ) : (
                          <span className="text-xs">—</span>
                        )}
                      </td>

                      {/* Bank / Payment */}
                      <td className="py-3 px-3 text-[11px]">
                        {s.bankName || s.bankAccountNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-medium text-foreground flex items-center gap-1">
                              <CreditCard className="w-3 h-3 text-muted-foreground" />
                              <span>{s.bankName || 'Bank'}</span>
                            </div>
                            {s.bankAccountNumber && (
                              <div className="font-mono text-muted-foreground text-[10px]">
                                A/C: {s.bankAccountNumber}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs gap-1 font-medium text-muted-foreground hover:text-foreground"
                            onClick={() => openEditModal(s)}
                            title="Edit Supplier"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggleStatus(s)}
                            title={isActive ? 'Deactivate Supplier' : 'Activate Supplier'}
                          >
                            <Power className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(s.id)}
                            title="Delete Supplier"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT SUPPLIER */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Truck className="w-4 h-4" />
              {editingSupplier ? 'Edit Material Supplier' : 'Register New Material Supplier'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              This supplier will immediately appear in the Billing Center purchase recording dropdown.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 py-1 text-xs">
            {formError && (
              <div className="p-2.5 rounded bg-destructive/10 text-destructive text-xs border border-destructive/20 font-medium">
                {formError}
              </div>
            )}

            {/* Company / Shop Name */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Shop / Enterprise Name</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </label>
              <Input
                value={formCompanyName}
                onChange={(e) => setFormCompanyName(e.target.value)}
                placeholder="e.g. Akij Particle Board Center"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Contact Person Name */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">
                Contact Person / Trade Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Md. Rafiqul Islam / Akij Store"
                required
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Primary Phone</label>
                <Input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 01711-XXXXXX"
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Email Address</label>
                <Input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="supplier@mail.com"
                  className="h-8 text-xs bg-background"
                />
              </div>
            </div>

            {/* Supply Category Selection */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Supply Category</label>
              <Input
                value={formSupplyCategory}
                onChange={(e) => setFormSupplyCategory(e.target.value)}
                placeholder="e.g. Boards & Panels, Hardware, Adhesives..."
                className="h-8 text-xs bg-background"
              />
              <div className="flex flex-wrap gap-1 pt-1">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormSupplyCategory(cat)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border"
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Shop Address */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Shop / Warehouse Address</label>
              <Input
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="e.g. Shop #12, Wood Market, Mirpur, Dhaka"
                className="h-8 text-xs bg-background"
              />
            </div>

            {/* Bank Info */}
            <div className="p-2.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <span className="text-[11px] font-semibold text-foreground flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                Bank / Disbursement Details (Optional)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={formBankName}
                  onChange={(e) => setFormBankName(e.target.value)}
                  placeholder="Bank Name (e.g. City Bank)"
                  className="h-7 text-xs bg-background"
                />
                <Input
                  value={formBankAccountNumber}
                  onChange={(e) => setFormBankAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="h-7 text-xs bg-background"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Internal Notes</label>
              <Input
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="e.g. Preferred delivery time, discount agreements..."
                className="h-8 text-xs bg-background"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="h-8 text-xs bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {editingSupplier ? 'Save Changes' : 'Register Supplier'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
