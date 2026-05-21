"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"

const stats = [
  { value: 10, label: "Years of Experience", suffix: "+" },
  { value: 352, label: "Client Reviews", suffix: "" },

  { value: 627, label: "Projects Completed", suffix: "" }, // CENTER

  { value: 95, label: "Client Satisfaction", suffix: "%" },
  { value: 25, label: "Commercial Spaces Designed", suffix: "" },
]

function AnimatedCounter({
  value,
  suffix,
  isInView,
}: {
  value: number
  suffix: string
  isInView: boolean
}) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return

    let start = 0
    const duration = 2000
    const increment = value / (duration / 16)

    const timer = setInterval(() => {
      start += increment
      if (start >= value) {
        setCount(value)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [isInView, value])

  return (
    <span>
      {count}
      {suffix}
    </span>
  )
}

export function TrustFiguresSection() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setIsInView(true),
      { threshold: 0.3 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className="py-20 lg:py-32 bg-[#0d3d3d] relative overflow-hidden"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#a57c00]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#a57c00]/5 rounded-full translate-x-1/3 translate-y-1/3" />

      <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-sm uppercase tracking-widest text-[#a57c00]">
            Our Achievements
          </span>
          <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-white">
            Numbers that speak for themselves
          </h2>
          <div className="mt-4 w-16 h-0.5 bg-[#a57c00] mx-auto" />
        </div>

        {/* Stats Layout */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 items-end text-center">
          {stats.map((stat, index) => {
            const isCenter = index === 2

            return (
              <div
                key={stat.label}
                className={`p-6 transition-all ${
                  isCenter ? "-translate-y-6 opacity-90" : "opacity-80"
                }`}
              >
                <span
                  className={`font-serif text-[#a57c00] block ${
                    isCenter
                      ? "text-6xl md:text-9xl lg:text-9xl"
                      : "text-5xl md:text-6xl"
                  }`}
                >
                  <AnimatedCounter
                    value={stat.value}
                    suffix={stat.suffix}
                    isInView={isInView}
                  />
                </span>

                <p
                  className={`mt-4 text-white/70 ${
                    isCenter ? "text-base md:text-lg font-medium" : "text-sm"
                  }`}
                >
                  {stat.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Button className="bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-8 py-6 text-sm"
          onClick={()=> router.push('/projects')}
          >
            Start Your Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
