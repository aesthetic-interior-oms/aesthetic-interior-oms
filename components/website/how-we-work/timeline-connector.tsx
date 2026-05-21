"use client"

import { useEffect, useRef, useState } from "react"

interface TimelineConnectorProps {
  fromStage: string
  toStage: string
}

export function TimelineConnector({ fromStage, toStage }: TimelineConnectorProps) {
  const [isVisible, setIsVisible] = useState(false)
  const connectorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.5 },
    )

    if (connectorRef.current) {
      observer.observe(connectorRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={connectorRef} className="flex items-center justify-center py-8" style={{ backgroundColor: "#f8f6f2" }}>
      <div className="flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
          style={{ backgroundColor: "#0d3d3d" }}
        >
          {fromStage}
        </div>
        <div className="relative h-1 w-24 md:w-40 overflow-hidden rounded-full bg-gray-200">
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
              isVisible ? "w-full" : "w-0"
            }`}
            style={{ backgroundColor: "#a57c00" }}
          />
        </div>
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium"
          style={{ backgroundColor: "#0d3d3d" }}
        >
          {toStage}
        </div>
      </div>
    </div>
  )
}
