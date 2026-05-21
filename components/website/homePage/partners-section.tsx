"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const partners = [
  { name: "Bosch", logo: "/bosch-brand-logo-simple.jpg" },
  { name: "Hettich", logo: "/hettich-logo-brand.png" },
  { name: "Hafele", logo: "/hafele-logo-brand.png" },
  { name: "Blum", logo: "/Blum-logo-brand.webp" },
  { name: "Siemens", logo: "/siemens.png" },
  { name: "Greenlam", logo: "/Greenlam-Logo-brand.png" },
  { name: "Asian Paints", logo: "/asianpaints-logo-brand.webp" },
]

export function PartnersSection() {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scrollContainer = scrollRef.current
    if (!scrollContainer) return

    let animationId: number
    let scrollPosition = 0
    const scrollSpeed = 0.5

    const animate = () => {
      scrollPosition += scrollSpeed
      if (scrollPosition >= scrollContainer.scrollWidth / 2) {
        scrollPosition = 0
      }
      scrollContainer.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    // Pause on hover
    const handleMouseEnter = () => cancelAnimationFrame(animationId)
    const handleMouseLeave = () => {
      animationId = requestAnimationFrame(animate)
    }

    scrollContainer.addEventListener("mouseenter", handleMouseEnter)
    scrollContainer.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      scrollContainer.removeEventListener("mouseenter", handleMouseEnter)
      scrollContainer.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return (
    <section className="py-16 lg:py-24 bg-card border-t border-border overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="text-sm uppercase tracking-widest text-[#a57c00]">Our Brand Partners</span>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-[#0d3d3d] text-balance">
            Trusted by leading brands
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            We work with trusted brands and suppliers to ensure quality, durability, and timeless design.
          </p>
        </div>
      </div>

      {/* Auto-scrolling logo slider */}
      <div
        ref={scrollRef}
        className="flex gap-16 overflow-hidden whitespace-nowrap py-8"
        style={{ scrollBehavior: "auto" }}
      >
        {/* Duplicate logos for seamless infinite scroll */}
        {[...partners, ...partners].map((partner, index) => (
          <div
            key={`${partner.name}-${index}`}
            className="flex-shrink-0 flex items-center justify-center w-40 h-20 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 transition-all duration-300"
          >
            <Image
              src={partner.logo || "/placeholder.svg"}
              alt={`${partner.name} brand logo`}
              width={160}
              height={80}
              sizes="160px"
              loading="lazy"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        ))}
      </div>
    </section>
  )
}
