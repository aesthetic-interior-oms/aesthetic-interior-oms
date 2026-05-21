"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function AboutCTA() {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in", "fade-in", "zoom-in-95")
            entry.target.classList.remove("opacity-0")
          }
        })
      },
      { threshold: 0.3 },
    )

    if (contentRef.current) {
      observer.observe(contentRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#a57c00]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#1a3a2f]/5 rounded-full translate-x-1/2 translate-y-1/2" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative">
        <div
          ref={contentRef}
          className="opacity-0 duration-1000 bg-[#a57c00] rounded-3xl p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden"
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white mb-6 text-balance">
              Let&apos;s Create Your Dream Space
            </h2>
            <p className="text-white/90 max-w-2xl mx-auto mb-8 text-lg leading-relaxed text-pretty">
              Whether it&apos;s a home, office, or commercial project, we bring your vision to life with creativity,
              precision, and care.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-[#a57c00] hover:bg-white/90 rounded-full px-8 group">
                Book a Consultation
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10 rounded-full px-8 bg-transparent"
              >
                View Our Portfolio
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
