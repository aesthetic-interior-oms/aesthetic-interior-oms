"use client"

import { useEffect, useRef, useState } from "react"
import { Home, Building2, Wrench, ArrowRight } from "lucide-react"
import Image from "next/image"

const services = [
  {
    icon: Home,
    title: "Residential Interiors",
    description: "Transform your home into a sanctuary that reflects your personality and lifestyle.",
    image: "/modernDesign.avif",
  },
  {
    icon: Building2,
    title: "Commercial Interiors",
    description: "Create inspiring workspaces that boost productivity and impress clients.",
    image: "/Commercial/Commercial1.png",
  },
  {
    icon: Wrench,
    title: "Renovation Projects",
    description: "Breathe new life into existing spaces with our expert renovation services.",
    image: "/Projects/Project2/05.jpg",
  },
  
]

export function WhatWeDo() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll(".service-card")
            cards.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
                card.classList.remove("opacity-0")
              }, index * 100)
            })
          }
        })
      },
      { threshold: 0.1 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 bg-[#1a3a2f]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            Our Services
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white mb-6 text-balance">What We Do</h2>
          <p className="text-white/70 max-w-2xl mx-auto leading-relaxed text-pretty">
            From concept to completion, we offer comprehensive interior design services to bring your vision to life.
          </p>
        </div>

        {/* Services Grid */}
        <div ref={sectionRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service, index) => (
            <div
              key={service.title}
              className="service-card opacity-0 group relative rounded-2xl overflow-hidden aspect-[4/3] cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Background Image */}
              <Image
                src={service.image || "/placeholder.svg"}
                alt={`${service.title} interior design service preview`}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />

              {/* Overlay */}
              <div
                className={`absolute inset-0 transition-all duration-500 ${hoveredIndex === index
                    ? "bg-[#1a3a2f]/90"
                    : "bg-gradient-to-t from-[#1a3a2f]/80 via-transparent to-transparent"
                  }`}
              />

              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className={`transition-all duration-500 ${hoveredIndex === index ? "mb-0" : "mb-0"}`}>
                  <div
                    className={`w-12 h-12 rounded-xl bg-[#a57c00] flex items-center justify-center mb-4 transition-all duration-300 ${hoveredIndex === index ? "scale-110" : ""
                      }`}
                  >
                    <service.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-serif font-light text-white mb-2">{service.title}</h3>
                  <p
                    className={`text-white/80 text-sm leading-relaxed transition-all duration-500 ${hoveredIndex === index ? "opacity-100 max-h-20" : "opacity-0 max-h-0 overflow-hidden"
                      }`}
                  >
                    {service.description}
                  </p>
                  <div
                    className={`flex items-center gap-2 text-[#a57c00] text-sm font-medium mt-3 transition-all duration-500 ${hoveredIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                      }`}
                  >
                    View More <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
