import Link from 'next/link'
import { getBoqAssignedTasks } from '@/lib/boq-service'
import {
  ClipboardList,
  Search,
  ArrowRight,
  FileCheck,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
} from 'lucide-react'

export const revalidate = 0

export default async function BoqAssignedTasksPage() {
  const tasks = await getBoqAssignedTasks()

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            BOQ Assigned Tasks
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a project to create or update its Material Requisition Chart
            based on its Approved Detail Quotation
          </p>
        </div>
      </div>

      {/* Task Cards & Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-muted/20 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Projects ({tasks.length})
          </span>
        </div>

        <div className="divide-y">
          {tasks.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto" />
              <h3 className="text-base font-semibold text-foreground">
                No Assigned Tasks Found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                No projects currently have approved detail quotations waiting
                for BOQ takeoff. Once a detail quotation is approved, it will
                appear here automatically.
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-5 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-foreground hover:text-primary">
                      <Link href={`/crm/boq/builder/${task.id}`}>
                        {task.name}
                      </Link>
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                      {task.stage.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {task.phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {task.location}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      Quotation Total: ৳
                      {task.quotationTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0">
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs text-muted-foreground">
                        Requisition:
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          String(task.requisitionStatus) === 'NOT_STARTED'
                            ? 'bg-muted text-muted-foreground'
                            : task.requisitionStatus === 'DRAFT'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {String(task.requisitionStatus) === 'NOT_STARTED'
                          ? 'Not Started'
                          : task.requisitionStatus}
                      </span>
                    </div>
                    {task.requisitionItemCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {task.requisitionItemCount} items added
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/crm/boq/builder/${task.id}`}
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 transition-colors"
                  >
                    {String(task.requisitionStatus) === 'NOT_STARTED'
                      ? 'Create Requisition'
                      : 'Edit Requisition'}
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
