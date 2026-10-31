'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ChevronDown, Lock, Info, Trash2, AlertTriangle, Plus, Shield, Building2 } from 'lucide-react'
import { toast } from 'sonner'

// Names of departments that are protected (managed by ensureStandardDepartmentsExist)
const SYSTEM_DEPARTMENT_NAMES = new Set([
  'ADMIN',
  'SR_CRM',
  'JR_CRM',
  'QUOTATION_TEAM',
  'VISIT_TEAM',
  'SPECIALIST_DESIGN_CONSULTANTS',
  'JR_ARCHITECT',
  '3D_VISUALIZER',
  'ACCOUNTS',
  'PROJECT_CORDINATOR',
  'PROCUREMENT',
  'BOQ',
  'PROJECT_ENGINEER',
  'SITE_ENGINEER',
  'ELECTRICIAN',
  'FACTORY_MANAGER',
  'IMPLEMENTATION_TEAM',
  'CARPENTRY',
  'PLUMBING',
  'CIVIL_WORKS',
  'LOGISTICS_DELIVERY',
])

interface Department {
  id: string
  name: string
  description: string | null
  _count: {
    userDepartments: number
  }
}

interface Permission {
  id: string
  name: string
  description: string
  category: string
}

interface RolePermissionMap {
  role: string
  permissions: string[]
  description: string | null
  color: string
  isSystem: boolean
}

const allPermissions: Permission[] = [
  // Lead Management
  { id: 'view_leads', name: 'View Leads', description: 'View all lead information', category: 'Lead Management' },
  { id: 'create_leads', name: 'Create Leads', description: 'Create new leads', category: 'Lead Management' },
  { id: 'edit_leads', name: 'Edit Leads', description: 'Edit lead details and information', category: 'Lead Management' },
  { id: 'delete_leads', name: 'Delete Leads', description: 'Delete leads from system', category: 'Lead Management' },
  { id: 'update_lead_status', name: 'Update Lead Status', description: 'Change lead stage and status', category: 'Lead Management' },

  // Followup Management
  { id: 'view_followups', name: 'View Followups', description: 'View all followup tasks', category: 'Followup Management' },
  { id: 'create_followups', name: 'Create Followups', description: 'Schedule new followups', category: 'Followup Management' },
  { id: 'edit_followups', name: 'Edit Followups', description: 'Edit existing followups', category: 'Followup Management' },
  { id: 'mark_followup_done', name: 'Mark Followup Done', description: 'Mark followups as completed', category: 'Followup Management' },

  // Visit Management
  { id: 'view_visits', name: 'View Visits', description: 'View scheduled visits', category: 'Visit Management' },
  { id: 'schedule_visits', name: 'Schedule Visits', description: 'Create and schedule new visits', category: 'Visit Management' },
  { id: 'update_visit_result', name: 'Update Visit Result', description: 'Update visit outcomes and notes', category: 'Visit Management' },

  // User Management
  { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, delete users', category: 'User Management' },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Manage roles and permissions', category: 'User Management' },
  { id: 'reset_password', name: 'Reset Password', description: 'Reset user passwords', category: 'User Management' },

  // System Management
  { id: 'view_activity_log', name: 'View Activity Log', description: 'View system activity logs', category: 'System Management' },
  { id: 'manage_settings', name: 'Manage Settings', description: 'Access system settings', category: 'System Management' },
  { id: 'manage_integrations', name: 'Manage Integrations', description: 'Configure external integrations', category: 'System Management' },
]

const permissionCategories = ['Lead Management', 'Followup Management', 'Visit Management', 'User Management', 'System Management']
const allPermissionIds = allPermissions.map((permission) => permission.id)

const getDepartmentPermissionMap = (department: Department): RolePermissionMap => {
  const departmentColorMap: Record<string, string> = {
    'ADMIN': 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
    'JR_CRM': 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200',
    'SR_CRM': 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200',
    'JR_ARCHITECT': 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200',
    '3D_VISUALIZER': 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
    'QUOTATION_TEAM': 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200',
    'VISIT_TEAM': 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200',
    'ACCOUNTS': 'bg-lime-100 dark:bg-lime-900/40 text-lime-800 dark:text-lime-200',
    'PROCUREMENT': 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200',
    'BOQ': 'bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-200',
  }

  const departmentPermissionsMap: Record<string, string[]> = {
    'ADMIN': allPermissionIds,
    'JR_CRM': [
      'view_leads', 'create_leads', 'edit_leads', 'update_lead_status',
      'view_followups', 'create_followups', 'edit_followups', 'mark_followup_done',
      'view_visits', 'schedule_visits',
      'view_activity_log'
    ],
    'SR_CRM': [
      'view_leads', 'create_leads', 'edit_leads', 'delete_leads', 'update_lead_status',
      'view_followups', 'create_followups', 'edit_followups', 'mark_followup_done',
      'view_visits', 'schedule_visits', 'update_visit_result',
      'view_activity_log'
    ],
    'JR_ARCHITECT': ['view_leads', 'view_followups', 'view_visits'],
    '3D_VISUALIZER': ['view_leads', 'view_followups', 'view_visits'],
    'QUOTATION_TEAM': ['view_leads', 'view_followups'],
    'VISIT_TEAM': ['view_leads', 'view_followups', 'view_visits', 'update_visit_result'],
    'ACCOUNTS': ['view_leads', 'view_followups', 'view_activity_log'],
  }

  return {
    role: department.name,
    permissions: departmentPermissionsMap[department.name] || [],
    description: department.description,
    color: departmentColorMap[department.name] || 'bg-gray-100 dark:bg-gray-900/40 text-gray-800 dark:text-gray-200',
    isSystem: SYSTEM_DEPARTMENT_NAMES.has(department.name),
  }
}

export function RolePermissions() {
  const [expandedRole, setExpandedRole] = useState<string | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMap[]>([])

  // Delete state
  const [deletingDept, setDeletingDept] = useState<Department | null>(null)
  const [confirmName, setConfirmName] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Add department state
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptDesc, setNewDeptDesc] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  // Filter state
  const [filter, setFilter] = useState<'all' | 'system' | 'custom'>('all')
  const [search, setSearch] = useState('')

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/department')
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setDepartments(result.data)
        setRolePermissions(result.data.map((dept: Department) => getDepartmentPermissionMap(dept)))
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [])

  const handleDeleteDepartment = async () => {
    if (!deletingDept || confirmName.trim() !== deletingDept.name.trim()) return
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const response = await fetch(`/api/department?id=${deletingDept.id}`, { method: 'DELETE' })
      const result = await response.json()
      if (result.success) {
        setDepartments((prev) => prev.filter((d) => d.id !== deletingDept.id))
        setRolePermissions((prev) => prev.filter((r) => r.role !== deletingDept.name))
        setDeletingDept(null)
        setConfirmName('')
        toast.success(`Department "${deletingDept.name}" deleted successfully`)
      } else {
        setDeleteError(result.error || 'Failed to delete department')
      }
    } catch {
      setDeleteError('Network error while deleting department')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleAddDepartment = async () => {
    const name = newDeptName.trim().toUpperCase().replace(/\s+/g, '_')
    if (!name) {
      setAddError('Department name is required')
      return
    }
    setIsAdding(true)
    setAddError(null)
    try {
      const response = await fetch('/api/department', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: newDeptDesc.trim() || null }),
      })
      const result = await response.json()
      if (result.success) {
        setShowAddDialog(false)
        setNewDeptName('')
        setNewDeptDesc('')
        toast.success(`Department "${name}" created successfully`)
        await fetchDepartments()
      } else {
        setAddError(result.error || 'Failed to create department')
      }
    } catch {
      setAddError('Network error while creating department')
    } finally {
      setIsAdding(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="border-border">
          <CardHeader>
            <CardTitle>Department Management</CardTitle>
            <CardDescription>Loading departments...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const getPermissionsByCategory = (permissions: string[], category: string) =>
    allPermissions.filter((p) => p.category === category && permissions.includes(p.id))

  const systemCount = rolePermissions.filter((r) => r.isSystem).length
  const customCount = rolePermissions.filter((r) => !r.isSystem).length

  const filteredRolePermissions = rolePermissions.filter((r) => {
    const matchesFilter =
      filter === 'all' ? true : filter === 'system' ? r.isSystem : !r.isSystem
    const matchesSearch = search
      ? r.role.toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(search.toLowerCase())
      : true
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Department Management</CardTitle>
              <CardDescription className="mt-1">
                {systemCount} system departments · {customCount} custom departments
              </CardDescription>
            </div>
            <Button
              onClick={() => { setShowAddDialog(true); setAddError(null); setNewDeptName(''); setNewDeptDesc('') }}
              className="flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Department
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Info */}
      <Card className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">System vs Custom Departments</p>
              <p>
                <span className="font-semibold">System</span> departments are protected and cannot be deleted — they are required for the app to work correctly.{' '}
                <span className="font-semibold">Custom</span> departments are created by you and can be deleted if they have no assigned users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search departments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2">
          {(['all', 'system', 'custom'] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f === 'all' ? `All (${rolePermissions.length})` : f === 'system' ? `System (${systemCount})` : `Custom (${customCount})`}
            </Button>
          ))}
        </div>
      </div>

      {/* Department List */}
      <div className="space-y-3">
        {filteredRolePermissions.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No departments match your filter.
            </CardContent>
          </Card>
        )}
        {filteredRolePermissions.map((roleData) => {
          const dept = departments.find((d) => d.name === roleData.role)
          return (
            <Card key={roleData.role} className="border-border overflow-hidden">
              <div
                onClick={() => setExpandedRole(expandedRole === roleData.role ? null : roleData.role)}
                className="cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                <CardHeader className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* System / Custom icon */}
                      {roleData.isSystem ? (
                        <span title="System department">
                          <Shield className="w-4 h-4 text-muted-foreground shrink-0" />
                        </span>
                      ) : (
                        <span title="Custom department">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={roleData.color}>{roleData.role}</Badge>
                          {roleData.isSystem ? (
                            <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground">
                              System
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {roleData.description || 'No description'} · {dept?._count.userDepartments ?? 0} user(s)
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expandedRole === roleData.role ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>
              </div>

              {expandedRole === roleData.role && (
                <CardContent className="space-y-6 border-t border-border pt-6">
                  {/* Permissions */}
                  {permissionCategories.map((category) => {
                    const categoryPermissions = getPermissionsByCategory(roleData.permissions, category)
                    if (categoryPermissions.length === 0) return null
                    return (
                      <div key={category}>
                        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <Lock className="w-4 h-4 text-primary" />
                          {category}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryPermissions.map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/30"
                            >
                              <div className="w-4 h-4 rounded-full bg-green-500 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground">{permission.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{permission.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}

                  {/* No permissions notice for custom depts */}
                  {roleData.permissions.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No explicit permission mapping — users in this department will have limited access by default.</p>
                  )}

                  {/* Restricted (for system depts with partial permissions) */}
                  {roleData.isSystem && roleData.role !== 'ADMIN' && roleData.permissions.length > 0 && (
                    <div className="border-t border-border pt-6">
                      <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-red-500" />
                        Restricted Features
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {permissionCategories
                          .filter((cat) => getPermissionsByCategory(roleData.permissions, cat).length === 0)
                          .flatMap((cat) => allPermissions.filter((p) => p.category === cat))
                          .slice(0, 6)
                          .map((permission) => (
                            <div
                              key={permission.id}
                              className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-secondary/10 opacity-50"
                            >
                              <div className="w-4 h-4 rounded-full bg-red-500/30 mt-0.5 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm text-foreground line-through">{permission.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Not available</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="border-t border-border pt-4 flex flex-wrap gap-2 justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {dept?._count.userDepartments ?? 0} user(s) assigned
                    </p>
                    <div className="flex gap-2">
                      {!roleData.isSystem ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (dept) {
                              setDeletingDept(dept)
                              setConfirmName('')
                              setDeleteError(null)
                            }
                          }}
                          className="flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete Department
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground border-muted-foreground/30 px-3 py-1">
                          <Shield className="w-3 h-3 mr-1" />
                          Protected — cannot delete
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDept} onOpenChange={(open) => !open && setDeletingDept(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
              Delete Department &quot;{deletingDept?.name}&quot;
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-3">
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                <p className="font-semibold">⚠️ Warning: Irreversible Action!</p>
                <p>Deleting this department will permanently remove it. Users assigned to it will be unassigned.</p>
                {deletingDept && deletingDept._count.userDepartments > 0 && (
                  <p className="font-bold pt-1">
                    {deletingDept._count.userDepartments} active user(s) are currently assigned to this department.
                  </p>
                )}
              </div>
              <div className="space-y-2 pt-1 text-left">
                <label className="text-xs font-semibold text-foreground">
                  Type the exact department name{' '}
                  <span className="font-mono font-bold select-all underline text-destructive">
                    {deletingDept?.name}
                  </span>{' '}
                  to confirm:
                </label>
                <Input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={deletingDept?.name}
                  className="text-sm font-mono"
                  autoFocus
                />
              </div>
              {deleteError && <p className="text-xs text-destructive font-medium">{deleteError}</p>}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => { setDeletingDept(null); setConfirmName(''); setDeleteError(null) }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDepartment}
              disabled={isDeleting || confirmName.trim() !== deletingDept?.name.trim()}
            >
              {isDeleting ? 'Deleting...' : 'Delete Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Department Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => !open && setShowAddDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add Custom Department
            </DialogTitle>
            <DialogDescription>
              Create a new department. The name will be automatically uppercased and spaces replaced with underscores (e.g. &quot;HR Team&quot; → &quot;HR_TEAM&quot;).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Department Name *</label>
              <Input
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                placeholder="e.g. HR Team"
                autoFocus
              />
              {newDeptName.trim() && (
                <p className="text-xs text-muted-foreground">
                  Will be saved as:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {newDeptName.trim().toUpperCase().replace(/\s+/g, '_')}
                  </span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description (optional)</label>
              <Input
                value={newDeptDesc}
                onChange={(e) => setNewDeptDesc(e.target.value)}
                placeholder="Brief description of this department"
              />
            </div>
            {addError && <p className="text-xs text-destructive font-medium">{addError}</p>}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isAdding}>
              Cancel
            </Button>
            <Button onClick={handleAddDepartment} disabled={isAdding || !newDeptName.trim()}>
              {isAdding ? 'Creating...' : 'Create Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
