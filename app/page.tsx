'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight } from 'lucide-react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'

export default function Home() {
  return (
    <div className="min-h-screen w-full overflow-hidden ">
      {/* Background with image and overlay */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url('/checkbackground.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          backgroundRepeat: 'no-repeat',
          opacity: 0.1,
        }}
      />

      {/* Dark overlay for better text contrast */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-foreground/20 via-transparent to-foreground/10 " />

      {/* Content Container */}
      <div className="relative z-10 min-h-screen w-full flex items-center justify-center px-4 py-8 opacity-80">
        <div className="max-w-2xl w-full">
          {/* Main Content Tab */}
          <div className="bg-card backdrop-blur-md border border-border/50 rounded-2xl p-12 md:p-16 shadow-2xl">
            {/* Company Name */}
            <div className="mb-8 text-center">
              <h1 className="text-5xl md:text-6xl font-light tracking-widest mb-4 text-foreground">
                <img src="/aesthetic-icon.png" alt="Aesthetic Interior Logo" className="w-24 h-24 mx-auto mb-4" />
                <span className="block text-5xl">AESTHETIC</span>
                <span className="text-xl block mt-2"><p className='tracking-18'>INTERIOR</p></span>
              </h1>
              <div className="h-1 w-16 bg-primary mx-auto rounded-full" />
            </div>

            {/* Subtitle */}
            <p className="text-center text-2xl text-muted-foreground text-lg md:text-xl mb-4 font-light leading-relaxed">
              Operations Management System
            </p>

            {/* Descriptive Text */}
            <p className="text-center text-sm text-foreground/70 text-base mb-12 leading-relaxed max-w-xl mx-auto">
              Streamline your interior design operations with our comprehensive management platform.
              Organize projects, manage teams, and deliver exceptional results with precision and elegance.
            </p>

            {/* CTA Button */}
            <div className="flex justify-center gap-4">
              <SignedOut>
                <SignInButton forceRedirectUrl="/onboarding">
                  <Button className="bg-gray-100 hover:bg-gray-200 text-black text-sm">Sign In</Button>
                </SignInButton>
                <SignUpButton forceRedirectUrl="/onboarding">
                  <Button className="bg-black hover:bg-gray-600 text-white text-sm">Sign Up</Button>
                </SignUpButton>
              </SignedOut>

              <SignedIn>
                <UserButton/>
                <Button variant="outline" className="text-sm" onClick={() => window.location.href = '/crm/jr/dashboard'}>
                  Go to Dashboard <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </SignedIn>
            </div>

            {/* Footer */}
            <div className="mt-12 text-xs pt-8 border-t border-border/30 text-center text-sm text-muted-foreground">
              <p>© 2024 Aesthetic Interior. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
