import Link from 'next/link'
import { SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CrmEntryPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <section className="w-full rounded-3xl border border-foreground/10 bg-background p-6 shadow-sm md:p-10">
          <p className="text-xs tracking-[0.28em] text-foreground/60">AESTHETIC INTERIOR CRM</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sign in to your workspace</h1>
          <p className="mt-4 max-w-2xl text-sm text-foreground/75 sm:text-base">
            Access lead management, team workflows, follow-up tracking, and department dashboards.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <SignedOut>
              <SignInButton forceRedirectUrl="/onboarding">
                <Button className="h-10 bg-foreground text-background hover:bg-foreground/90">Sign In</Button>
              </SignInButton>
              <SignUpButton forceRedirectUrl="/onboarding">
                <Button variant="outline" className="h-10">Sign Up</Button>
              </SignUpButton>
            </SignedOut>

            <SignedIn>
              <Button asChild className="h-10 bg-foreground text-background hover:bg-foreground/90">
                <Link href="/onboarding">
                  Continue to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </SignedIn>
          </div>

          <div className="mt-10 border-t border-foreground/10 pt-5">
            <Link href="/" className="text-sm text-foreground/70 underline-offset-4 hover:underline">
              Back to Company Website
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
