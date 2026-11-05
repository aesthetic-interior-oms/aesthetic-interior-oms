export type BehaviourTagOption = {
  tag: string
  label: string
  type: 'positive' | 'negative' | 'neutral'
  defaultPoints: number
  description: string
}

export const BEHAVIOUR_TAG_OPTIONS: BehaviourTagOption[] = [
  { tag: 'BEST', label: 'Best', type: 'positive', defaultPoints: 10, description: 'Outstanding conduct, proactive leadership & teamwork' },
  { tag: 'BETTER', label: 'Better', type: 'positive', defaultPoints: 5, description: 'Above average, reliable, strong initiative' },
  { tag: 'GOOD', label: 'Good', type: 'positive', defaultPoints: 2, description: 'Positive attitude, respectful & cooperative' },
  { tag: 'NEUTRAL', label: 'Average / Normal', type: 'neutral', defaultPoints: 0, description: 'Standard expectations met' },
  { tag: 'BAD', label: 'Bad', type: 'negative', defaultPoints: -5, description: 'Irresponsible, poor client or team communication' },
  { tag: 'WORSE', label: 'Worse', type: 'negative', defaultPoints: -10, description: 'Repeated indiscipline, client complaints, uncooperative' },
  { tag: 'WORST', label: 'Worst', type: 'negative', defaultPoints: -15, description: 'Severe misconduct, policy violations, disruptive behavior' },
]

export function getBehaviourPointsForTag(tag: string | null | undefined): number {
  if (!tag) return 0
  const normalized = tag.trim().toUpperCase()
  const found = BEHAVIOUR_TAG_OPTIONS.find((opt) => opt.tag === normalized)
  return found ? found.defaultPoints : 0
}

export type MemberAssessmentData = {
  absentDays: number
  attendanceScore: number
  behaviourTag: string | null
  behaviourScore: number
  notes: string | null
}

export type VisitPerformanceRow = {
  id: string
  name: string
  totalVisits: number
  completed: number
  leadVisits: number
  supportVisits: number
  reportCompleteness: number
  totalSqft: number
  avgSqft: number
  absentDays: number
  attendanceScore: number
  behaviourTag: string | null
  behaviourScore: number
  behaviourNote: string | null
  operationalScore: number
  performance: number
}
