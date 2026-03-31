'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Building2, Mail, Power, RefreshCw, Search, UserCheck, UserX, Users2 } from 'lucide-react'

type UserApiItem = {
  id: string
  fullName: string
  email: string
  isActive: boolean
}

type DepartmentApiItem = {
  id: string
  name: string
  description?: string | null
}
type DepartmentsResponse = {
  success?: boolean
  data?: DepartmentApiItem[]
  error?: string
}

type DepartmentUsersResponse = {
  success?: boolean
  data?: {
    users?: UserApiItem[]
  }
  error?: string
}

export function UserManagement() {
  const [departments, setDepartments] = useState<
    Array<{ key: string; name: string; users: UserApiItem[] }>
  >([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [togglingIds, setTogglingIds] = useState<Record<string, boolean>>({})

  const loadData = useCallback(async () => {
    setLoading(true)
    setStatusError(null)
    try {
      const departmentsResponse = await fetch('/api/department', { cache: 'no-store' })

      const departmentsPayload = (await departmentsResponse.json()) as DepartmentsResponse
      if (!departmentsResponse.ok || !departmentsPayload.success || !Array.isArray(departmentsPayload.data)) {
        throw new Error(departmentsPayload.error ?? 'Failed to load departments')
      }

      const departmentRows = departmentsPayload.data
      const usersByDepartment = await Promise.all(
        departmentRows.map(async (department) => {
          const response = await fetch(`/api/department/${department.id}/users`, { cache: 'no-store' })
          const payload = (await response.json()) as DepartmentUsersResponse
          if (!response.ok || !payload.success) {
            throw new Error(payload.error ?? `Failed to load users for ${department.name}`)
          }

          return {
            key: department.id,
            name: department.name,
            users: Array.isArray(payload.data?.users) ? payload.data.users : [],
          }
        }),
      )

      setDepartments(usersByDepartment)
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to load user/department data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const departmentSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return departments.map((department) => {
      const sectionUsers = department.users.filter((user) => {
        return (
          query.length === 0 ||
          user.fullName.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
        )
      })

      return {
        key: department.key,
        name: department.name,
        users: sectionUsers,
      }
    })
  }, [departments, searchQuery])

  const summary = useMemo(() => {
    const allUsers = departmentSections.flatMap((section) => section.users)
    const uniqueUsers = Array.from(new Map(allUsers.map((user) => [user.id, user])).values())
    const active = uniqueUsers.filter((user) => user.isActive).length
    return {
      totalDepartments: departmentSections.length,
      totalUsers: uniqueUsers.length,
      activeUsers: active,
      inactiveUsers: uniqueUsers.length - active,
    }
  }, [departmentSections])

  const getInitials = (name: string) => {
    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  }

  const toggleUserStatus = async (user: UserApiItem) => {
    setStatusMessage(null)
    setStatusError(null)
    setTogglingIds((prev) => ({ ...prev, [user.id]: true }))

    try {
      const response = await fetch(`/api/user/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })

      const payload = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to update user status')
      }

      setDepartments((prev) =>
        prev.map((item) =>
          item.users.some((sectionUser) => sectionUser.id === user.id)
            ? {
                ...item,
                users: item.users.map((sectionUser) =>
                  sectionUser.id === user.id
                    ? { ...sectionUser, isActive: !user.isActive }
                    : sectionUser,
                ),
              }
            : item,
        ),
      )
      setStatusMessage(
        `${user.fullName} is now ${user.isActive ? 'inactive' : 'active'}.`,
      )
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update user status')
    } finally {
      setTogglingIds((prev) => ({ ...prev, [user.id]: false }))
    }
  }

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 text-sm text-muted-foreground">Loading users...</CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border bg-gradient-to-r from-slate-50 to-stone-50 dark:from-slate-950 dark:to-zinc-950">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">User Management</CardTitle>
              <CardDescription>
                Organized by department with clear status control for assignment workflow.
              </CardDescription>
            </div>
            <Button variant="outline" className="gap-2" onClick={() => void loadData()}>
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Departments</p>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.totalDepartments}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Users</p>
              <Users2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.totalUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active</p>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-emerald-600">{summary.activeUsers}</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Inactive</p>
              <UserX className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-amber-600">{summary.inactiveUsers}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {departmentSections.map((section) => (
          <Card key={section.key} className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-secondary p-2">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{section.name}</CardTitle>
                    <CardDescription>Department user roster</CardDescription>
                  </div>
                </div>
                <Badge variant="secondary">{section.users.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {section.users.length === 0 && (
                <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No users found in this department.
                </div>
              )}

              {section.users.map((user) => (
                <div
                  key={`${section.key}-${user.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {getInitials(user.fullName)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.fullName}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={user.isActive ? 'default' : 'secondary'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      disabled={Boolean(togglingIds[user.id])}
                      onClick={() => void toggleUserStatus(user)}
                    >
                      <Power className="h-3.5 w-3.5" />
                      {user.isActive ? 'Disable' : 'Enable'}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {departmentSections.length === 0 && (
        <Card className="border-border">
          <CardContent className="py-8 text-sm text-muted-foreground">
            No departments found. Create departments first, then assign users.
          </CardContent>
        </Card>
      )}

      {(statusMessage || statusError) && (
        <Card className={statusError ? 'border-red-200 bg-red-50/70' : 'border-green-200 bg-green-50/70'}>
          <CardContent className={`pt-6 text-sm ${statusError ? 'text-red-700' : 'text-green-700'}`}>
            {statusError ?? statusMessage}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
