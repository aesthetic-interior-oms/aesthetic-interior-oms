'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Mail, Phone, MapPin, DollarSign } from 'lucide-react'

type LeadCreateModalProps = {
  onCreated?: () => void
}

export default function LeadCreateModal({ onCreated }: LeadCreateModalProps) {
  const [open, setOpen] = useState(false)
  
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    location: '',
    budget: '',
    source: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone || undefined,
      location: form.location || undefined,
      budget: form.budget ? Number(form.budget) : undefined,
      source: form.source || undefined,
    }
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      setOpen(false)
      setForm({
        name: '',
        email: '',
        phone: '',
        location: '',
        budget: '',
        source: '',
      })
      if (onCreated) onCreated()
    } else {
      setError(data.error || 'Failed to create lead')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-foreground hover:bg-foreground/70 text-background">
          <Plus className="w-4 h-4" />
          Add Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">Create New Lead</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">Add a new lead to your pipeline</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-foreground">Full Name *</label>
            <Input 
              id="name"
              name="name" 
              value={form.name} 
              onChange={handleChange} 
              placeholder="John Doe"
              className="border-gray-200"
              required 
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email *
            </label>
            <Input 
              id="email"
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              placeholder="john@example.com"
              type="email"
              className="border-gray-200"
              required 
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" /> Phone
            </label>
            <Input 
              id="phone"
              name="phone" 
              value={form.phone} 
              onChange={handleChange} 
              placeholder="+1 (555) 000-0000"
              className="border-gray-200"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label htmlFor="location" className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Location
            </label>
            <Input 
              id="location"
              name="location" 
              value={form.location} 
              onChange={handleChange} 
              placeholder="City, Country"
              className="border-gray-200"
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <label htmlFor="source" className="text-sm font-medium text-foreground">Source</label>
            <select 
              id="source"
              name="source" 
              value={form.source} 
              onChange={handleChange} 
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-background text-foreground text-sm"
            >
              <option value="">Select a source</option>
              <option value="Website">Website</option>
              <option value="Referral">Referral</option>
              <option value="Social Media">Social Media</option>
              <option value="Direct Call">Direct Call</option>
              <option value="Showroom Visit">Showroom Visit</option>
              <option value="Advertisement">Advertisement</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Budget */}
          <div className="space-y-2">
            <label htmlFor="budget" className="text-sm font-medium text-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" /> Budget
            </label>
            <Input 
              id="budget"
              name="budget" 
              value={form.budget} 
              onChange={handleChange} 
              placeholder="0.00"
              type="number"
              min="0"
              step="0.01"
              className="border-gray-200"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <DialogFooter className="flex gap-3 pt-4 border-t">
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancel</Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Creating...' : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
