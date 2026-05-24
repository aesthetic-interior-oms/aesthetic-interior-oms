"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"

const teamMembers = [
  {
    name: "Nazrul Islam",
    role: "General Manager",
    image: "/user/User1.jpg",
    specialty: "Administration Department",
    quote: "We believe every project should reflect trust, clarity, and long-term value for our clients.",
  },
  {
    name: "Arup Ratan Mandal",
    role: "Assistant General Manager",
    image: "/user/User4.jpg",
    specialty: "Administration Department",
    quote: "Our strength is teamwork, where every department works together to deliver a smooth client experience.",
  },
  {
    name: "Jannatul Ferdous Urmi",
    role: "Senior Architect",
    image: "/user/User2.jpg",
    specialty: "Architect Department",
    quote: "Good design starts with listening deeply and turning each client vision into functional beauty.",
  },
  {
    name: "Sourav Dey",
    role: "Project Cordinator",
    image: "/user/User3.jpg",
    specialty: "Execution Department",
    quote: "Execution quality and timeline discipline are the promises we bring to every project site.",
  },
  {
    name: "Faima Shorna",
    role: "HR Administration",
    image: "/user/User5.jpeg",
    specialty: "Human Resources Department",
    quote: "A strong company culture helps us serve clients better and grow as a dependable design team.",
  },
  {
    name: "Moriom Ritu",
    role: "Junior Executive",
    image: "/user/User6.jpeg",
    specialty: "Client Relationship Management",
    quote: "Clear communication and care for client needs are at the center of everything we do.",
  },
  {
    name: "Ovijit Chowdhury",
    role: "Junior Architect",
    image: "/user/User7.jpeg",
    specialty: "Architect Department",
    quote: "We focus on meaningful details so every space feels thoughtful, practical, and timeless.",
  },
]

export function OurTeam() {
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const rows = entry.target.querySelectorAll(".team-row")
            rows.forEach((row, index) => {
              setTimeout(() => {
                row.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
                row.classList.remove("opacity-0")
              }, index * 150)
            })
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
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            Meet The Experts
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#1a3a2f] mb-6 text-balance">
            Our Team
          </h2>
          <p className="text-[#4a4a4a] max-w-2xl mx-auto leading-relaxed text-pretty">
            A passionate team of designers, architects, and project managers dedicated to bringing your vision to
            life.
          </p>
        </div>

        <div ref={sectionRef} className="space-y-8 lg:space-y-10">
          {teamMembers.map((member, index) => {
            const isEven = index % 2 === 0

            return (
              <article
                key={member.name}
                className={`team-row rounded-2xl transition-all duration-500 p-5 sm:p-7 lg:p-8`}
              >
                <div
                  className={`flex flex-col gap-6 lg:gap-10 items-center ${
                    isEven ? "lg:flex-row" : "lg:flex-row-reverse"
                  }`}
                >
                  <div className="w-full lg:w-[28%]">
                    <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-[#e9e6dd]">
                      <Image
                        src={member.image || "/placeholder.svg"}
                        alt={`${member.name}, ${member.role} at Aesthetic Interior Studio`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 38vw"
                        loading="lazy"
                        className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                      />
                    </div>
                  </div>

                  <div className={`w-full lg:w-[72%] ${isEven ? "lg:text-left" : "lg:text-right"} text-center`}>
                    <h3 className="text-2xl lg:text-3xl font-serif text-[#1a3a2f]">{member.name}</h3>
                    <p className="mt-2 text-sm text-[#a57c00] font-medium">
                      {member.role} in {member.specialty}
                    </p>
                    <p className="mt-5 text-[#4f4f4f] leading-relaxed text-base lg:text-lg">
                      “{member.quote}”
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
