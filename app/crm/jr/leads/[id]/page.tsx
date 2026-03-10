'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  DollarSign,
  User,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  MessageSquare,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const stageColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  LEAD_CREATED: { bg: 'bg-blue-50 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-200', icon: '🎯' },
  CONTACT_ATTEMPTED: { bg: 'bg-yellow-50 dark:bg-yellow-950', text: 'text-yellow-700 dark:text-yellow-200', icon: '📞' },
  CONTACTED: { bg: 'bg-cyan-50 dark:bg-cyan-950', text: 'text-cyan-700 dark:text-cyan-200', icon: '✓' },
  NURTURING: { bg: 'bg-purple-50 dark:bg-purple-950', text: 'text-purple-700 dark:text-purple-200', icon: '🌱' },
  QUALIFIED: { bg: 'bg-green-50 dark:bg-green-950', text: 'text-green-700 dark:text-green-200', icon: '⭐' },
  VISIT_SCHEDULED: { bg: 'bg-indigo-50 dark:bg-indigo-950', text: 'text-indigo-700 dark:text-indigo-200', icon: '📅' },
  CONVERTED: { bg: 'bg-emerald-50 dark:bg-emerald-950', text: 'text-emerald-700 dark:text-emerald-200', icon: '🎉' },
  REJECTED: { bg: 'bg-red-50 dark:bg-red-950', text: 'text-red-700 dark:text-red-200', icon: '✗' },
}

const substageColors: Record<string, string> = {
  NO_ANSWER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
  WARM_LEAD: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  COLD_LEAD: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100',
  INTERESTED: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
}

type LeadDetails = {
  id: string
  name: string
  phone: string | null
  email: string
  source: string | null
  stage: string
  subStatus: string | null
  budget: number | null
  location: string | null
  remarks: string | null
  assignedTo: string | null
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    fullName: string
    email: string
  } | null
}

type Note = {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
  lead: {
    id: string
    name: string
    email: string
  }
}

type Activity = {
  id: string
  type: string
  description: string
  createdAt: string
  user: {
    id: string
    fullName: string
    email: string
  }
}

type Followup = {
  id: string
  followupDate: string
  notes: string
  status: string
  assignedTo: {
    id: string
    fullName: string
    email: string
  }
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notesLoading, setNotesLoading] = useState(false)
  const [stage, setStage] = useState('LEAD_CREATED')
  const [newNote, setNewNote] = useState('')
  const [submittingNote, setSubmittingNote] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Real API data
  const [notes, setNotes] = useState<Note[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [followups, setFollowups] = useState<Followup[]>([])

  // Fetch current user
  useEffect(() => {
    console.log('[LeadDetail] phase=fetch_user_start timestamp=', new Date().toISOString());
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      console.log('[LeadDetail] phase=ssr_skip reason=server_side_rendering');
      return;
    }
    
    // Log the fetch URL for debugging
    const fetchUrl = '/api/me';
    console.log('[LeadDetail] phase=fetch_user_url url=', fetchUrl, 'window.location.origin=', window.location.origin);
    
    fetch(fetchUrl)
      .then(res => {
        console.log('[LeadDetail] phase=fetch_user_response status=', res.status, 'ok=', res.ok);
        return res.json();
      })
      .then(data => {
        console.log('[LeadDetail] phase=fetch_user_parsed data.id=', data.id, 'data.error=', data.error);
        if (data.id) {
          console.log('[LeadDetail] phase=set_current_user_id userId=', data.id);
          setCurrentUserId(data.id)
        } else {
          console.log('[LeadDetail] phase=user_data_missing_id data=', JSON.stringify(data).substring(0, 200));
        }
      })
      .catch((error) => {
        console.error('[LeadDetail] phase=fetch_user_error error=', error.message, 'stack=', error.stack, 'error=', error);
        // Check if it's a network error
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
          console.error('[LeadDetail] DIAGNOSIS: Network error - likely server not running or not accessible');
          console.error('[LeadDetail] DIAGNOSIS: Check if the dev server is running at http://192.168.0.147:3000');
        }
      })
  }, [])

  // Fetch lead details
  useEffect(() => {
    console.log('[LeadDetail] phase=fetch_lead_start leadId=', leadId, 'timestamp=', new Date().toISOString());
    setLoading(true)
    fetch(`/api/lead/${leadId}`)
      .then(res => {
        console.log('[LeadDetail] phase=fetch_lead_response leadId=', leadId, 'status=', res.status);
        return res.json()
      })
      .then(data => {
        console.log('[LeadDetail] phase=fetch_lead_parsed leadId=', leadId, 'success=', data.success, 'hasData=', Boolean(data.data));
        setLead(data.data)
        setStage(data.data?.stage || 'LEAD_CREATED')
        setActivities(data.data?.activities || [])
        setFollowups(data.data?.followUps || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('[LeadDetail] phase=fetch_lead_error leadId=', leadId, 'error=', error.message, 'stack=', error.stack);
        setLoading(false)
      })
  }, [leadId])

  // Fetch notes for the lead
  useEffect(() => {
    console.log('[LeadDetail] phase=fetch_notes_start leadId=', leadId, 'timestamp=', new Date().toISOString());
    setNotesLoading(true)
    fetch(`/api/note/${leadId}`)
      .then(res => {
        console.log('[LeadDetail] phase=fetch_notes_response leadId=', leadId, 'status=', res.status);
        return res.json()
      })
      .then(data => {
        console.log('[LeadDetail] phase=fetch_notes_parsed leadId=', leadId, 'success=', data.success, 'count=', data.data?.length || 0, 'error=', data.error);
        if (data.success) {
          console.log('[LeadDetail] phase=set_notes leadId=', leadId, 'notesCount=', data.data.length);
          setNotes(data.data)
        } else {
          console.log('[LeadDetail] phase=fetch_notes_failed leadId=', leadId, 'error=', data.error);
        }
        setNotesLoading(false)
      })
      .catch((error) => {
        console.error('[LeadDetail] phase=fetch_notes_error leadId=', leadId, 'error=', error.message, 'stack=', error.stack);
        setNotesLoading(false)
      })
  }, [leadId])

  // Handle adding a new note
  const handleAddNote = async () => {
    console.log('[LeadDetail] phase=handle_add_note_start leadId=', leadId, 'currentUserId=', currentUserId, 'noteLength=', newNote.trim().length);
    
    if (!newNote.trim() || !currentUserId) {
      console.warn('[LeadDetail] phase=handle_add_note_validation_failed newNote.trim()=', Boolean(newNote.trim()), 'currentUserId=', Boolean(currentUserId));
      return
    }

    console.log('[LeadDetail] phase=add_note_submitting leadId=', leadId, 'userId=', currentUserId);
    setSubmittingNote(true)
    try {
      const payload = {
        content: newNote,
        userId: currentUserId,
      };
      console.log('[LeadDetail] phase=add_note_fetch_start url=/api/note/', leadId, 'payload=', JSON.stringify(payload));

      const response = await fetch(`/api/note/${leadId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('[LeadDetail] phase=add_note_response status=', response.status, 'ok=', response.ok);

      const data = await response.json()
      console.log('[LeadDetail] phase=add_note_parsed success=', data.success, 'hasData=', Boolean(data.data), 'error=', data.error);

      if (data.success) {
        console.log('[LeadDetail] phase=add_note_success noteId=', data.data?.id);
        setNotes([data.data, ...notes])
        setNewNote('')
      } else {
        console.error('[LeadDetail] phase=add_note_failed error=', data.error);
      }
    } catch (error) {
      console.error('[LeadDetail] phase=add_note_error leadId=', leadId, 'error=', error instanceof Error ? error.message : String(error), 'stack=', error instanceof Error ? error.stack : undefined);
    } finally {
      setSubmittingNote(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Button onClick={() => router.back()} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <p className="mt-4 text-muted-foreground">Loading lead details...</p>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="p-6">
        <Button onClick={() => router.back()} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <p className="mt-4 text-muted-foreground">Lead not found</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header Bar */}
      <div className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{lead?.name || 'Lead Details'}</h1>
              <p className="text-sm text-muted-foreground mt-1 truncate">{lead?.location || 'Location not provided'}</p>
            </div>
          </div>
          {lead && (
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
              <Badge className={`px-3 py-1 text-sm font-medium ${stageColors[lead.stage]?.bg || stageColors.LEAD_CREATED?.bg}`}>
                <span className="mr-2">{stageColors[lead.stage]?.icon || '•'}</span>
                <span className="hidden sm:inline">{lead.stage}</span>
                <span className="sm:hidden text-xs">{lead.stage.substring(0, 3)}</span>
              </Badge>
              {lead.subStatus && (
                <Badge variant="outline" className={`${substageColors[lead.subStatus]} text-xs sm:text-sm`}>
                  {lead.subStatus}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading lead details...</p>
            </div>
          </div>
        )}

        {!loading && !lead && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-foreground font-medium">Lead not found</p>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && lead && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
            {/* Main Content - 3 columns */}
            <div className="lg:col-span-3 space-y-6 w-full">
              {/* Contact Information */}
              <Card className="border-border w-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                        <p className="text-base font-semibold text-foreground mt-1">{lead.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                        <p className="text-base font-semibold text-foreground mt-1 truncate">{lead.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</p>
                        <p className="text-base font-semibold text-foreground mt-1">{lead.location || '—'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Budget</p>
                        <p className="text-base font-semibold text-foreground mt-1">
                          {lead.budget ? `৳${lead.budget.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="border-t border-border mt-6 pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Source</p>
                        <Badge variant="secondary" className="mt-2">{lead.source || 'Unknown'}</Badge>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</p>
                        <p className="text-sm text-foreground mt-2">{new Date(lead.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assignment Information */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Assignment Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {lead.assignee ? (
                      <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg border border-border">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {lead.assignee.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground">{lead.assignee.fullName}</p>
                          <p className="text-sm text-muted-foreground truncate">{lead.assignee.email}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Not assigned yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Notes, Activity, and Followups */}
              <Tabs defaultValue="notes" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="notes" className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Notes</span>
                    <span className="sm:hidden">Notes</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center gap-2">
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">Activity</span>
                    <span className="sm:hidden">Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="followups" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="hidden sm:inline">Followups</span>
                    <span className="sm:hidden">Followups</span>
                  </TabsTrigger>
                </TabsList>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Add Note</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Write your notes here..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={4}
                        className="resize-none"
                      />
                      <Button 
                        onClick={handleAddNote} 
                        className="w-full"
                        disabled={!newNote.trim() || submittingNote}
                      >
                        {submittingNote ? 'Adding...' : 'Add Note'}
                      </Button>
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {notesLoading && (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <div className="inline-block w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          <p className="text-muted-foreground text-sm mt-3">Loading notes...</p>
                        </CardContent>
                      </Card>
                    )}
                    {!notesLoading && notes.length === 0 && (
                      <Card>
                        <CardContent className="pt-8 pb-8 text-center">
                          <MessageSquare className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-muted-foreground text-sm">No notes yet. Add your first note to get started!</p>
                        </CardContent>
                      </Card>
                    )}
                    {!notesLoading && notes.map((note) => (
                      <Card key={note.id} className="hover:shadow-md transition-all duration-200 border-border">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700 flex items-center justify-center text-white text-sm font-bold">
                              {note.user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline justify-between gap-2 mb-1">
                                <p className="font-semibold text-foreground text-sm">{note.user.fullName}</p>
                                <p className="text-xs text-muted-foreground flex-shrink-0">
                                  {new Date(note.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground mb-2">{note.user.email}</p>
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
                                {note.content}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-3">
                  {activities.length === 0 && (
                    <Card>
                      <CardContent className="pt-8 pb-8 text-center">
                        <History className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground text-sm">No activity recorded yet.</p>
                      </CardContent>
                    </Card>
                  )}
                  {activities.map((activity) => (
                    <Card key={activity.id} className="border-border hover:shadow-sm transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex gap-4">
                          <div className="flex-shrink-0 pt-1">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                              {activity.type === 'USER_ASSIGNED' && <User className="w-4 h-4 text-primary" />}
                              {activity.type === 'FOLLOWUP_SET' && <Calendar className="w-4 h-4 text-primary" />}
                              {activity.type === 'STATUS_CHANGE' && <TrendingUp className="w-4 h-4 text-primary" />}
                              {activity.type === 'LEAD_CREATED' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                              {!['USER_ASSIGNED', 'FOLLOWUP_SET', 'STATUS_CHANGE', 'LEAD_CREATED'].includes(activity.type) && 
                                <AlertCircle className="w-4 h-4 text-primary" />}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <div>
                                <p className="font-semibold text-foreground text-sm capitalize">{activity.type.replace(/_/g, ' ')}</p>
                                <p className="text-xs text-muted-foreground">{activity.user.fullName}</p>
                              </div>
                              <p className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                                {new Date(activity.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>

                {/* Followups Tab */}
                <TabsContent value="followups" className="space-y-3">
                  {followups.length === 0 && (
                    <Card>
                      <CardContent className="pt-8 pb-8 text-center">
                        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground text-sm">No followups scheduled.</p>
                      </CardContent>
                    </Card>
                  )}
                  {followups.map((followup) => (
                    <Card key={followup.id} className="border-border hover:shadow-sm transition-shadow">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-primary" />
                              <p className="font-semibold text-foreground">
                                {new Date(followup.followupDate).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{followup.notes}</p>
                            <div className="flex items-center gap-2 text-xs">
                              <User className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-muted-foreground">{followup.assignedTo.fullName}</span>
                            </div>
                          </div>
                          <Badge className={followup.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200' : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'}>
                            {followup.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Sidebar - 1 column */}
            <div className="space-y-4 h-fit">
              {/* Lead Status Card */}
              <Card className="border-border sticky top-24">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Lead Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Current Stage</p>
                    <Badge className={`w-full text-center justify-center py-2 ${stageColors[lead.stage]?.bg}`}>
                      {lead.stage}
                    </Badge>
                  </div>
                  {lead.subStatus && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sub Status</p>
                      <Badge variant="outline" className={`w-full text-center justify-center py-2 ${substageColors[lead.subStatus]}`}>
                        {lead.subStatus}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Timeline Card */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Created</p>
                    <p className="text-foreground font-medium mt-1">
                      {new Date(lead.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="border-t border-border pt-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Last Updated</p>
                    <p className="text-foreground font-medium mt-1">
                      {new Date(lead.updated_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Remarks Card */}
              {lead.remarks && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary" />
                      Remarks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground leading-relaxed">
                      {lead.remarks}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
