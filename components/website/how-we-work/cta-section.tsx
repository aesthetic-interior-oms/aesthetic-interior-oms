"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight, Phone } from "lucide-react"

const stats = [
  { target: 10, suffix: "+", label: "Years Experience" },
  { target: 350, suffix: "+", label: "Projects Completed" },
  { target: 627, suffix: "+", label: "Designs Completed" },
  { target: 95, suffix: "%", label: "Client Satisfaction" },
]

export function CtaSection() {
  const [isVisible, setIsVisible] = useState(false)
  const [hoveredStat, setHoveredStat] = useState<number | null>(null)
  const [counters, setCounters] = useState(stats.map(() => 0))
  const sectionRef = useRef<HTMLElement>(null)
  const intervalsRef = useRef<NodeJS.Timeout[]>([])

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

  useEffect(() => {
    if (isVisible) {
      stats.forEach((stat, index) => {
        const interval = setInterval(() => {
          setCounters((prev) => {
            const newCounters = [...prev]
            if (newCounters[index] < stat.target) {
              newCounters[index] += Math.ceil(stat.target / 50) // Adjust speed
            } else {
              newCounters[index] = stat.target
              clearInterval(intervalsRef.current[index])
            }
            return newCounters
          })
        }, 50) // Adjust interval speed
        intervalsRef.current[index] = interval
      })
    }

    return () => {
      intervalsRef.current.forEach((interval) => clearInterval(interval))
    }
  }, [isVisible])

  return (
    <section ref={sectionRef} className="py-24 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #f8f6f2 0%, #fff 100%)",
        }}
      />

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-2 bg-[#a57c00]" />

      <div className="container mx-auto px-6 relative z-10">
        <div
          className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        >
          <p className="text-sm font-sans tracking-[0.3em] uppercase mb-4 font-medium text-[#a57c00]">
            Start Your Journey
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0d3d3d] mb-6 text-balance">
            Interiors Designed for Every Budget
          </h2>
          <p className="text-[#4a4a4a] font-sans text-lg max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
            Take the next step toward your ideal space with guidance from our experts. Whether you&apos;re planning a
            new home or upgrading your workspace, we&apos;re here to help.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-[#a57c00] text-white px-8 py-6 text-lg font-sans hover:bg-[#c99a00] transition-all duration-300 group"
            >
              Book Consultation
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-6 text-lg font-sans transition-all duration-300 group border-[#0d3d3d] text-[#0d3d3d] hover:bg-[#0d3d3d] hover:text-white bg-transparent"
            >
              <Phone className="mr-2 h-5 w-5" />
              Call Us Now
            </Button>
          </div>
        </div>

        {/* Trust Indicators with enhanced interactivity */}
        <div
          className={`mt-16 pt-12 border-t border-gray-200 transition-all duration-700 delay-300 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
            }`}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="group cursor-default relative"
                onMouseEnter={() => setHoveredStat(index)}
                onMouseLeave={() => setHoveredStat(null)}
              >
                {/* Background highlight on hover */}
                <div
                  className={`absolute inset-0 -m-4 rounded-2xl transition-all duration-500 ${hoveredStat === index ? "bg-[#0d3d3d]/5 scale-100" : "bg-transparent scale-95"
                    }`}
                />

                <div className="relative">
                  <p
                    className={`text-3xl md:text-4xl font-serif mb-2 transition-all duration-300 text-[#0d3d3d] ${hoveredStat === index ? "scale-110 text-[#a57c00]" : ""
                      }`}
                  >
                    {counters[index]}
                    {stat.suffix}
                  </p>
                  <p className="text-gray-500 font-sans text-sm">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
