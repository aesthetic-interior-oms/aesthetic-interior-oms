"use client"

import { useEffect, useRef } from "react"
import { Quote } from "lucide-react"
import Image from "next/image"

const ceoMessage = {
  name: "Jahirul Islam",
  title: "Chief Executive Officer",
  caption: "A clear vision shapes every extraordinary space.",
  description:
    "Good design is never just about how a space looks-it is entirely about how it feels, functions, and inspires the people within it. At Aesthetic Interior, our team is relentlessly dedicated to elevating your environment. We don't believe in one-size-fits-all solutions; instead, we push the boundaries of creativity and precision to engineer bespoke spaces that truly reflect your unique identity, elevate your lifestyle, and match your highest ambitions.",
}

export function CeoVision() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
            entry.target.classList.remove("opacity-0")
          }
        })
      },
      { threshold: 0.2 },
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  return (
    <section className="py-24 bg-[#f5f4f0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            What Our CEO Says
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#1a3a2f] mb-5 text-balance">
            Our Vision
          </h2>
          <p className="text-[#4a4a4a] max-w-2xl mx-auto leading-relaxed text-pretty">{ceoMessage.caption}</p>
        </div>

        <div
          ref={sectionRef}
          className="duration-1000 rounded-3xl p-7 sm:p-10 lg:p-12"
        >
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 items-center">
            <div className="w-full lg:w-[40%] flex justify-center lg:justify-start">
              <div className="relative w-72 h-96 lg:w-96 lg:h-[32rem] rounded-2xl overflow-hidden bg-[#e9e6dd] animate-in fade-in zoom-in-95 duration-700">
                <Image
                  src="/user/UserCEO2.jpeg"
                  alt="Jahirul Islam, CEO of Aesthetic Interior"
                  fill
                  sizes="(max-width: 1024px) 288px, 384px"
                  className="object-cover object-center transition-transform duration-700 hover:scale-105"
                  loading="lazy"
                />
              </div>
            </div>

            <div className="w-full lg:w-[60%]">
              <div className="flex items-center gap-3 mb-4">
                <Quote className="w-6 h-6 text-[#a57c00]" />
                <p className="text-[#a57c00] text-sm tracking-[0.2em] uppercase">Leadership Note</p>
              </div>

              <p className="text-[#4a4a4a] leading-relaxed text-base lg:text-lg">“{ceoMessage.description}”</p>

              <div className="mt-8 pt-6">
                <h3 className="text-2xl font-serif text-[#1a3a2f]">{ceoMessage.name}</h3>
                <p className="text-sm text-[#2E8B57] mt-1">{ceoMessage.title}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
