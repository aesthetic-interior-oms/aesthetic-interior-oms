"use client"

import { useEffect, useRef, useState } from "react"

const stageLabels = [
  "Initial Connection",
  "Design Creation",
  "Execution Begins",
  "Installation Phase",
  "Project Handover",
]

export function StagesIntro() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredStage, setHoveredStage] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.3 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const scrollToStage = (stageNum: number) => {
    const stageElement = document.getElementById(`stage-${String(stageNum).padStart(2, "0")}`)
    if (stageElement) {
      stageElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section id="stages-intro" ref={sectionRef} className="py-24 md:py-32 bg-[#f8f6f2]">
      <div className="container mx-auto px-6 text-center">
        <div
          className={`transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <p className="text-sm font-sans tracking-[0.3em] uppercase mb-4 font-medium text-[#a57c00]">How It Works</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0d3d3d] mb-6 text-balance">
            Your Dream Interior
          </h2>
          <p className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light mb-8 text-[#0d3d3d] text-balance">
            in 5 Simple Stages
          </p>
          <p className="text-[#4a4a4a] font-sans text-lg max-w-2xl mx-auto leading-relaxed text-pretty">
            Planning a new home or upgrading your workspace?
            <br />
            Here&apos;s how we turn your vision into reality.
          </p>
        </div>

        <div
          className={`flex justify-center items-center gap-6 md:gap-10 mt-16 transition-all duration-700 delay-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          {[1, 2, 3, 4, 5].map((num, index) => (
            <div
              key={num}
              className="group cursor-pointer relative"
              onMouseEnter={() => setHoveredStage(num)}
              onMouseLeave={() => setHoveredStage(null)}
              onClick={() => scrollToStage(num)}
            >
              {/* Outer pulse ring on hover */}
              <div
                className={`absolute inset-0 rounded-full bg-[#a57c00] transition-all duration-500 ${
                  hoveredStage === num ? "scale-150 opacity-20" : "scale-100 opacity-0"
                }`}
              />

              {/* Middle ring */}
              <div
                className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                  hoveredStage === num
                    ? "scale-125 border-[#a57c00] opacity-60"
                    : "scale-100 border-transparent opacity-0"
                }`}
              />

              {/* Main circle */}
              <div
                className={`relative w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center font-sans font-medium text-lg md:text-xl transition-all duration-500 ${
                  hoveredStage === num
                    ? "bg-[#a57c00] text-white scale-110 shadow-xl shadow-[#a57c00]/30"
                    : "bg-[#0d3d3d] text-white"
                }`}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                {String(num).padStart(2, "0")}
              </div>

              {/* Tooltip label on hover */}
              <div
                className={`absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 ${
                  hoveredStage === num ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
                }`}
              >
                <span className="text-xs md:text-sm font-sans font-medium text-[#0d3d3d] bg-white px-3 py-1.5 rounded-full shadow-md">
                  {stageLabels[index]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Connecting line between numbers */}
        <div
          className={`hidden md:flex justify-center mt-[-52px] mb-8 transition-all duration-700 delay-500 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="w-[400px] h-[2px] bg-gradient-to-r from-transparent via-[#0d3d3d]/20 to-transparent" />
        </div>
      </div>
    </section>
  )
}
