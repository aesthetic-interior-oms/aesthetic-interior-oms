import Link from 'next/link'
import {
  Settings,
  ArrowLeft,
  Bell,
  Sliders,
  Shield,
  Layers,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ProcurementSettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Settings</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Procurement Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure department preferences, notifications and material categories
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Fulfillment Preferences */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Requisition & Fulfillment Preferences
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage how completed requisitions and purchasing pipelines behave
              </p>
            </div>
          </div>

          <div className="divide-y divide-border pt-2 text-sm">
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Auto-notify BOQ on Fulfillment</div>
                <div className="text-xs text-muted-foreground">
                  Send system notification when requisition items are marked as fulfilled
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Enabled
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Default Requisition View</div>
                <div className="text-xs text-muted-foreground">
                  First tab displayed when opening the requisition module
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                Completed Requisitions
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Material Wastage Buffer Check</div>
                <div className="text-xs text-muted-foreground">
                  Validate wastage allowances (typically 5% - 15%) on material takeoffs
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Alerts & Notifications
              </h3>
              <p className="text-xs text-muted-foreground">
                Control alert thresholds for newly submitted BOQ requisitions
              </p>
            </div>
          </div>

          <div className="divide-y divide-border pt-2 text-sm">
            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">New BOQ Submissions</div>
                <div className="text-xs text-muted-foreground">
                  Notify procurement whenever a new material chart is finalized
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Instant Alert
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Vendor Payment Reminders</div>
                <div className="text-xs text-muted-foreground">
                  Reminders for pending vendor disbursements and delivery receipts
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Weekly Digest
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
