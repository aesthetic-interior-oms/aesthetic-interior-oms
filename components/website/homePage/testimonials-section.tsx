"use client"

import { Quote } from "lucide-react"
import { useEffect, useRef } from "react"
import Image from "next/image"

const testimonials = [
  {
    quote:
      "Working with the team was smooth and professional. They understood our needs and delivered exactly what we imagined.",
    author: "Siam Hossain",
    project: "Residential Project",
    image: "/client agreement/Client-agreement1.jpg",
  },
  {
    quote:
      "Our home now feels calm, modern, and beautifully designed. We loved the experience from start to finish.",
    author: "Nafiz Islam",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement2.jpg",
  },
  {
    quote: "Design and execution were seamless. Highly recommended!",
    author: "Raihan Kabir",
    project: "Commercial Project",
    image: "/client agreement/Client-agreement3.jpg",
  },
  {
    quote:
      "They transformed our space into something timeless and elegant. Every detail was thoughtfully planned.",
    author: "Tanvir Hasan",
    project: "Residential Project",
    image: "/client agreement/Client-agreement4.jpg",
  },
  {
    quote:
      "From concept to completion, the process was stress-free and transparent. Truly professional work.",
    author: "Shakib Anwar",
    project: "Residential Project",
    image: "/client agreement/Client-agreement5.jpg",
  },
  {
    quote:
      "The design perfectly reflects our lifestyle. The balance between aesthetics and functionality is impressive.",
    author: "Mahin Chowdhury",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement6.jpg",
  },
  {
    quote:
      "Attention to detail and quality materials made all the difference. The final result exceeded expectations.",
    author: "Sabbir Rahman",
    project: "Renovation Project",
    image: "/client agreement/Client-agreement7.jpg",
  },
  {
    quote:
      "Minimal, warm, and elegant—exactly what we wanted. Communication throughout the project was excellent.",
    author: "Ishraq Mahmud",
    project: "Residential Project",
    image: "/client agreement/Client-agreement8.jpg",
  },
  {
    quote:
      "Their team understands space planning extremely well. Every corner feels purposeful and refined.",
    author: "Arafat Karim",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement9.jpg",
  },
  {
    quote:
      "Professional execution with a strong design vision. We felt confident at every stage of the project.",
    author: "Mehedi Hasan",
    project: "Commercial Project",
    image: "/client agreement/Client-agreement10.jpg",
  },
  {
    quote:
      "The outcome was polished and practical, and the process stayed organized from start to finish.",
    author: "Rakib Uddin",
    project: "Residential Project",
    image: "/client agreement/Client-agreement11.jpg",
  },
  {
    quote:
      "Creative ideas, clear communication, and excellent finishing quality made this a great experience.",
    author: "Fahim Reza",
    project: "3D Design",
    image: "/client agreement/Client-agreement12.jpg",
  },
  {
    quote:
      "The design team delivered exactly what we discussed and the handover quality was excellent.",
    author: "Shafin Ahmed",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement11.jpg",
  },
]
export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef(0.5) // normal speed

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let scrollPosition = 0
    let animationId: number

    const animate = () => {
      scrollPosition += speedRef.current

      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0
      }

      container.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleMouseEnter = () => {
      speedRef.current = 0.15 // slow on hover
    }

    const handleMouseLeave = () => {
      speedRef.current = 0.5 // back to normal
    }

    container.addEventListener("mouseenter", handleMouseEnter)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener("mouseenter", handleMouseEnter)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return (
    <section className="py-20 lg:py-32 bg-card border-t border-border overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-12 text-center">
        <span className="text-sm uppercase tracking-widest text-[#a57c00]">
          Testimonials
        </span>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-[#0d3d3d]">
          What our clients say
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-8 overflow-hidden px-6 lg:px-8"
      >
        {[...testimonials, ...testimonials].map((t, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-80 md:w-96 p-6 bg-white/90 backdrop-blur-md rounded-lg shadow-lg text-center"
          >
            <Image
              src={t.image}
              alt={`${t.author} testimonial project photo`}
              width={640}
              height={384}
              sizes="(max-width: 768px) 320px, 384px"
              loading="lazy"
              className="w-full h-48 object-cover object-top rounded-lg mb-4"
            />

            <Quote className="h-6 w-6 text-[#a57c00]/40 mx-auto mb-4" />

            <p className="italic text-gray-700 text-base leading-relaxed break-words">
              “{t.quote}”
            </p>

            <div className="mt-4 pt-4 border-t border-border">
              <span className="font-medium text-[#0d3d3d]">{t.author}</span>
              <span className="block text-sm text-gray-500 mt-1">
                {t.project}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
