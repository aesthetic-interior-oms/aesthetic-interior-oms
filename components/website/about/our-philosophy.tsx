"use client"

import { useEffect, useRef } from "react"
import { Palette, Scale, Leaf, Sparkles } from "lucide-react"

const philosophyCards = [
  {
    icon: Palette,
    title: "Creativity",
    description: "Every design reflects beauty and uniqueness, tailored to your vision.",
  },
  {
    icon: Scale,
    title: "Balance",
    description: "Combining aesthetics with functionality for harmonious spaces.",
  },
  {
    icon: Leaf,
    title: "Sustainability",
    description: "Eco-conscious materials for a lasting, positive impact.",
  },
  {
    icon: Sparkles,
    title: "Excellence",
    description: "Attention to detail that elevates every project we undertake.",
  },
]

export function OurPhilosophy() {
  const cardsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll(".philosophy-card")
            cards.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
                card.classList.remove("opacity-0")
              }, index * 150)
            })
          }
        })
      },
      { threshold: 0.2 },
    )

    if (cardsRef.current) {
      observer.observe(cardsRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 bg-[#f5f4f0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            Our Philosophy
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#1a3a2f] mb-6 text-balance">
            What Drives Us
          </h2>
          <p className="text-[#4a4a4a] max-w-2xl mx-auto leading-relaxed text-pretty">
            Our design philosophy is rooted in understanding your needs and translating them into spaces that inspire,
            function, and endure.
          </p>
        </div>

        {/* Cards Grid */}
        <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {philosophyCards.map((card) => (
            <div
              key={card.title}
              className="philosophy-card opacity-0 group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-2"
            >
              <div className="w-14 h-14 rounded-xl bg-[#1a3a2f] flex items-center justify-center mb-6 group-hover:bg-[#a57c00] transition-colors duration-300">
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-serif font-light text-[#1a3a2f] mb-3">{card.title}</h3>
              <p className="text-[#6a6a6a] leading-relaxed text-sm">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
