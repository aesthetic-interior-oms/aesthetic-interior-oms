"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

export function CtaSection() {
  const router = useRouter()
  return (

    <section className="py-20 lg:py-32 relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/beautiful-modern-interior-design-living-space-warm.jpg"
          alt="Warm modern living space interior design background"
          fill
          sizes="100vw"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#0d3d3d]/80" />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-sm uppercase tracking-widest text-[#a57c00]">Get Started</span>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-white text-balance">
            Ready to transform your space?
          </h2>
          <p className="mt-6 text-lg text-white/80">
            Start with a simple conversation and let us guide you through the rest.
          </p>
          <Button 
          onClick={()=> router.push('/contact')}
          className="mt-10 bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-8 py-6 text-sm">
            Start Your Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
