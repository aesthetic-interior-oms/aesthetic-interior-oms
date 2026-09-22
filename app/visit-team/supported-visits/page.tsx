import { redirect } from 'next/navigation'

export default function SupportedVisitsRedirect() {
  redirect('/visit-team/partial-visits')
}
