"use client"

import { useEffect, useRef, useState } from "react"
import { Compass, Users, ClipboardCheck } from "lucide-react"

const teamMembers = [
  {
    title: "Project Architect",
    description: "Leads the design direction and ensures your home reflects your personality and lifestyle.",
    icon: Compass,
  },
  {
    title: "Client Manager",
    description: "Supervises the full journey, coordinating communication and keeping everything running smoothly.",
    icon: Users,
  },
  {
    title: "Project Coordinator",
    description: "Manages on-site execution to guarantee timely delivery and precision in every step.",
    icon: ClipboardCheck,
  },
]

export function TeamSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.2 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="py-24 md:py-32 bg-[#0d3d3d]">
      <div className="container mx-auto px-6">
        <div
          className={`text-center mb-16 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        >
          <p className="text-sm font-sans tracking-[0.3em] uppercase mb-4 font-medium text-[#a57c00]">
            Your Dedicated Team
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white mb-6 text-balance">Meet Your Project Team</h2>
          <p className="text-white/70 font-sans max-w-2xl mx-auto leading-relaxed text-pretty">
            A dedicated team of professionals committed to bringing your vision to life with expertise and care.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {teamMembers.map((member, index) => (
            <div
              key={member.title}
              className={`group transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
              style={{ transitionDelay: `${(index + 1) * 200}ms` }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className={`relative rounded-2xl p-8 border transition-all duration-500 h-full cursor-pointer ${hoveredIndex === index
                    ? "bg-white border-white shadow-2xl shadow-[#a57c00]/20 -translate-y-3"
                    : "bg-white/5 backdrop-blur-sm border-white/10 hover:border-white/30"
                  }`}
              >
                {/* Icon with enhanced hover */}
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 transition-all duration-500 ${hoveredIndex === index ? "bg-[#0d3d3d] scale-110 rotate-6" : "bg-[#a57c00]"
                    }`}
                >
                  <member.icon
                    className={`w-8 h-8 transition-colors duration-300 ${hoveredIndex === index ? "text-[#a57c00]" : "text-white"
                      }`}
                  />
                </div>

                <h3
                  className={`text-xl font-serif font-light mb-3 transition-colors duration-300 ${hoveredIndex === index ? "text-[#0d3d3d]" : "text-white"
                    }`}
                >
                  {member.title}
                </h3>
                <p
                  className={`font-sans leading-relaxed transition-colors duration-300 ${hoveredIndex === index ? "text-gray-600" : "text-white/60"
                    }`}
                >
                  {member.description}
                </p>

                {/* Arrow indicator on hover */}
                <div
                  className={`absolute bottom-8 right-8 transition-all duration-500 ${hoveredIndex === index ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                    }`}
                >
                  <div className="w-10 h-10 rounded-full bg-[#a57c00] flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </div>
                </div>

                {/* Decorative Element */}
                <div
                  className={`absolute top-4 right-4 w-24 h-24 rounded-full transition-all duration-500 ${hoveredIndex === index ? "bg-[#a57c00]/10 scale-150" : "bg-[#a57c00]/5 scale-100"
                    }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
