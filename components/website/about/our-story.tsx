"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

const timelineSteps = [
  {
    year: "2015",
    title: "Founded in Dhaka",
    description: "Started with a vision to transform interior design in Bangladesh.",
    image: "/about/AestheticBuilding.jpeg",
  },
  {
    year: "2017",
    title: "First Residential Project",
    description: "Completed our first major residential interior transformation.",
    image: "/about/FirstResedentialProject.png",
  },
  {
    year: "2019",
    title: "Commercial Expansion",
    description: "Expanded services to include commercial and corporate interiors.",
    image: "/about/Factory.png",
  },
  {
    year: "2021",
    title: "Team Growth",
    description: "Grew to a team of 20+ experts in design and execution.",
    image: "/about/teamgrowth.png",
  },
  {
    year: "2024",
    title: "100+ Projects",
    description: "Celebrated completing over 100 successful projects.",
    image: "/about/20Projects.jpeg",
  },
]

export function OurStory() {
  const [activeIndex, setActiveIndex] = useState(-1)
  const [progress, setProgress] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return

      const section = sectionRef.current
      const sectionTop = section.offsetTop
      const sectionHeight = section.offsetHeight
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight

      // Calculate progress through the section
      const startTrigger = sectionTop - windowHeight * 0.5
      const endTrigger = sectionTop + sectionHeight - windowHeight * 0.5
      const scrollProgress = Math.max(0, Math.min(1, (scrollY - startTrigger) / (endTrigger - startTrigger)))
      setProgress(scrollProgress * 100)

      // Check each timeline item
      itemRefs.current.forEach((item, index) => {
        if (!item) return
        const rect = item.getBoundingClientRect()
        const itemCenter = rect.top + rect.height / 2

        if (itemCenter < windowHeight * 0.7) {
          setActiveIndex((prev) => Math.max(prev, index))
        }
      })
    }

    window.addEventListener("scroll", handleScroll)
    handleScroll() // Initial check
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <section ref={sectionRef} className="py-24 bg-white overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-20">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            Our Journey
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#1a3a2f] mb-6 text-balance">Our Story</h2>
          <p className="text-[#4a4a4a] max-w-2xl mx-auto leading-relaxed text-pretty">
            From humble beginnings to becoming a leading interior design studio, our journey has been marked by passion,
            creativity, and commitment.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Animated Progress Line - Desktop */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#e5e5e5] hidden lg:block -translate-x-1/2">
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#a57c00] to-[#1a3a2f] transition-all duration-500 ease-out"
              style={{ height: `${progress}%` }}
            />
          </div>

          {/* Mobile Progress Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-[#e5e5e5] lg:hidden">
            <div
              className="absolute top-0 left-0 w-full bg-gradient-to-b from-[#a57c00] to-[#1a3a2f] transition-all duration-500 ease-out"
              style={{ height: `${progress}%` }}
            />
          </div>

          {/* Timeline Items */}
          <div className="space-y-16 lg:space-y-24">
            {timelineSteps.map((step, index) => {
              const isActive = index <= activeIndex
              const isEven = index % 2 === 0

              return (
                <div
                  key={step.year}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  className={`relative lg:flex lg:items-center transition-all duration-700 ${isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                    }`}
                >
                  {/* Content Card */}
                  <div
                    className={`pl-16 lg:pl-0 lg:w-1/2 transition-all duration-700 delay-200 ${isEven ? "lg:pr-20 lg:text-right" : "lg:pl-20"
                      } ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <div
                      className={`bg-[#f5f4f0] rounded-2xl p-8 relative overflow-hidden group hover:shadow-xl transition-shadow duration-500 ${isActive ? "animate-in slide-in-from-bottom-4 duration-700" : ""
                        }`}
                    >
                      {/* Decorative corner */}
                      <div
                        className={`absolute top-0 ${isEven ? "right-0" : "left-0"} w-24 h-24 bg-[#2E8B57]/15 rounded-bl-full transition-transform duration-500 group-hover:scale-150`}
                      />

                      {/* Year badge */}
                      <div className={`inline-flex items-center gap-2 mb-4 ${isEven ? "lg:flex-row-reverse" : ""}`}>
                        <span className="text-[#a57c00] font-bold text-3xl lg:text-4xl">{step.year}</span>
                        <div className="w-8 h-0.5 bg-[#a57c00]" />
                      </div>

                      <h3 className="text-xl lg:text-2xl font-serif font-light text-[#1a3a2f] mb-3">{step.title}</h3>
                      <p className="text-[#6a6a6a] leading-relaxed">{step.description}</p>
                    </div>
                  </div>

                  {/* Center Circle/Node */}
                  <div
                    className={`absolute left-6 lg:left-1/2 lg:-translate-x-1/2 top-8 lg:top-1/2 lg:-translate-y-1/2 z-10 transition-all duration-500 ${isActive ? "scale-100" : "scale-0"
                      }`}
                  >
                    <div className="relative">
                      {/* Pulse ring */}
                      <div
                        className={`absolute inset-0 rounded-full bg-[#a57c00] transition-all duration-1000 ${isActive ? "animate-ping opacity-30" : "opacity-0"
                          }`}
                        style={{ animationDuration: "2s" }}
                      />

                      {/* Main circle */}
                      <div
                        className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-4 border-white shadow-lg transition-all duration-500 ${isActive ? "bg-[#a57c00]" : "bg-[#e5e5e5]"
                          }`}
                      />
                    </div>
                  </div>

                  {/* Image */}
                  <div
                    className={`pl-16 lg:pl-0 lg:w-1/2 mt-6 lg:mt-0 transition-all duration-700 delay-300 ${isEven ? "lg:pl-20" : "lg:pr-20"
                      } ${isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  >
                    <div className="rounded-2xl overflow-hidden aspect-[4/3] shadow-lg group">
                      <Image
                        src={step.image || "/placeholder.svg"}
                        alt={`${step.title} milestone image`}
                        width={1200}
                        height={900}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        loading="lazy"
                        className={`w-full h-full object-cover transition-transform duration-700 ${isActive ? "scale-100 group-hover:scale-110" : "scale-110"
                          }`}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* End marker */}
          <div className="flex justify-center mt-16">
            <div
              className={`transition-all duration-700 ${activeIndex >= timelineSteps.length - 1 ? "opacity-100 scale-100" : "opacity-0 scale-0"}`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-[#1a3a2f]" />
                <span className="text-sm text-[#a57c00] tracking-wider uppercase font-medium">And counting...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
