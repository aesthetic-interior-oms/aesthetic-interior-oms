"use client"

import { Quote } from "lucide-react"
import { useEffect, useRef } from "react"
import Image from "next/image"
import { Noto_Serif_Bengali } from "next/font/google"
import type { WebsiteTestimonial } from "@/lib/website-testimonials"

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
})

export function TestimonialsCarousel({ testimonials }: { testimonials: WebsiteTestimonial[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef(0.5)

  useEffect(() => {
    const container = scrollRef.current
    if (!container || testimonials.length === 0) return

    let scrollPosition = 0
    let animationId: number

    const animate = () => {
      scrollPosition += speedRef.current
      if (scrollPosition >= container.scrollWidth / 2) scrollPosition = 0
      container.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    const handleMouseEnter = () => { speedRef.current = 0.15 }
    const handleMouseLeave = () => { speedRef.current = 0.5 }

    container.addEventListener("mouseenter", handleMouseEnter)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener("mouseenter", handleMouseEnter)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [testimonials.length])

  if (testimonials.length === 0) return null

  return (
    <div ref={scrollRef} className="flex gap-8 overflow-hidden px-6 lg:px-8">
      {[...testimonials, ...testimonials].map((t, index) => (
        <div key={`${t.id}-${index}`} className="flex-shrink-0 w-80 md:w-96 p-6 bg-white/90 backdrop-blur-md rounded-lg shadow-lg text-center">
          <Image src={t.image} alt={`${t.author} testimonial project photo`} width={640} height={384} sizes="(max-width: 768px) 320px, 384px" loading="lazy" className="w-full h-48 object-cover object-top rounded-lg mb-4" />
          <Quote className="h-6 w-6 text-[#a57c00]/40 mx-auto mb-4" />
          <p className={`${notoSerifBengali.className} text-gray-800 text-[17px] leading-8 font-medium tracking-wide break-words`}>“{t.quote}”</p>
          <div className="mt-4 pt-4 border-t border-border">
            <span className="font-medium text-[#0d3d3d]">{t.author}</span>
            <span className="block text-sm text-gray-500 mt-1">{t.project}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
