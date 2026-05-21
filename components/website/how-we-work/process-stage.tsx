"use client"

import { useEffect, useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import Image from "next/image"

interface ProcessStageProps {
  stageNumber: string
  title: string
  subtitle: string
  description: string
  steps: {
    title: string
    description: string
    icon?: LucideIcon
  }[]
  isReversed?: boolean
  imageSrc: string
}

export function ProcessStage({
  stageNumber,
  title,
  subtitle,
  description,
  steps,
  isReversed = false,
  imageSrc,
}: ProcessStageProps) {
  const [isVisible, setIsVisible] = useState(false)
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
    <section ref={sectionRef} className="py-20 md:py-28 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className={`grid md:grid-cols-2 gap-12 md:gap-20 items-center ${isReversed ? "md:flex-row-reverse" : ""}`}>
          {/* Content Side */}
          <div
            className={`${isReversed ? "md:order-2" : ""} ${
              isVisible ? (isReversed ? "animate-slide-in-right" : "animate-slide-in-left") : "opacity-0"
            }`}
            style={{ animationDelay: "0.2s" }}
          >
            <div className="mb-8">
              <span className="text-6xl md:text-8xl font-light opacity-20" style={{ color: "#0d3d3d" }}>
                {stageNumber}
              </span>
              <div className="-mt-8 md:-mt-12">
                <p className="text-sm tracking-[0.2em] uppercase mb-2 font-medium" style={{ color: "#a57c00" }}>
                  {subtitle}
                </p>
                <h3 className="text-3xl md:text-4xl font-light" style={{ color: "#0d3d3d" }}>
                  {title}
                </h3>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">{description}</p>

            <div className="space-y-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="group p-5 rounded-xl transition-all duration-300 hover:shadow-lg cursor-pointer border border-transparent hover:border-gray-100"
                  style={{ backgroundColor: "#f8f6f2" }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:scale-110"
                      style={{ backgroundColor: "#0d3d3d" }}
                    >
                      {step.icon ? (
                        <step.icon className="w-5 h-5 text-white" />
                      ) : (
                        <span className="text-white text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <div>
                      <h4
                        className="font-medium mb-1 group-hover:translate-x-1 transition-transform"
                        style={{ color: "#0d3d3d" }}
                      >
                        {step.title}
                      </h4>
                      <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Image Side */}
          <div
            className={`${isReversed ? "md:order-1" : ""} ${
              isVisible ? (isReversed ? "animate-slide-in-left" : "animate-slide-in-right") : "opacity-0"
            }`}
            style={{ animationDelay: "0.4s" }}
          >
            <div className="relative group">
              <div
                className="absolute -inset-4 rounded-2xl opacity-50 blur-xl transition-opacity duration-300 group-hover:opacity-70"
                style={{ backgroundColor: "#0d3d3d" }}
              />
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src={imageSrc || "/placeholder.svg"}
                  alt={`${title} process stage image`}
                  width={1200}
                  height={900}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="w-full h-[400px] md:h-[500px] object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 opacity-20" style={{ backgroundColor: "#0d3d3d" }} />
                <div className="absolute bottom-6 left-6 right-6">
                  <div
                    className="backdrop-blur-md rounded-xl p-4 border border-white/20"
                    style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                  >
                    <p className="text-sm font-medium" style={{ color: "#0d3d3d" }}>
                      Stage {stageNumber}
                    </p>
                    <p className="text-gray-600 text-xs">{subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
