"use client"

import { useEffect, useRef, useState } from "react"
import { Linkedin, Twitter, Mail } from "lucide-react"
import Image from "next/image"

const teamMembers = [
  {
    name: "Nazrul Islam",
    role: "General Manager",
    image: "/user/User1.jpg",
    specialty: "Administration Department",
    senior: true,
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Arup Ratan Mandal",
    role: "Assistant General Manager",
    image: "/user/User4.jpg",
    specialty: "Administration Department",
    senior: true,
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Jannatul Ferdous Urmi",
    role: "Senior Architect",
    image: "/user/User2.jpg",
    specialty: "Architect Department",
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Sourav Dey",
    role: "Project Cordinator",
    image: "/user/User3.jpg",
    specialty: "Execution Department",
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Faima Shorna",
    role: "HR Administration",
    image: "/user/User5.jpeg",
    specialty: "Human Resources Department",
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Moriom Ritu",
    role: "Junior Executive",
    image: "/user/User6.jpeg",
    specialty: "Client Relationship Management",
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
  {
    name: "Ovijit Chowdhury",
    role: "Junior Architect",
    image: "/user/User7.jpeg",
    specialty: "Architect Department",
    social: { linkedin: "#", twitter: "#", email: "#" },
  },
]

export function OurTeam() {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)
  const seniorMembers = teamMembers.filter((member) => member.senior)
  const otherMembers = teamMembers.filter((member) => !member.senior)

  const renderTeamCard = (member: (typeof teamMembers)[number], hoverIndex: number) => (
    <article
      key={member.name}
      className="team-card opacity-0 group w-full max-w-[290px] mx-auto"
      onMouseEnter={() => setHoveredIndex(hoverIndex)}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="relative rounded-2xl overflow-hidden mb-5 aspect-square bg-[#e9e6dd]">
        <Image
          src={member.image || "/placeholder.svg"}
          alt={`${member.name}, ${member.role} at Aesthetic Interior Studio`}
          fill
          sizes="(max-width: 640px) 290px, 290px"
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        />
        <div
          className={`absolute inset-0 bg-[#1a3a2f]/75 flex items-center justify-center gap-3 transition-all duration-500 ${
            hoveredIndex === hoverIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          <a
            href={member.social.linkedin}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-[#a57c00] transition-colors"
            aria-label="LinkedIn"
          >
            <Linkedin className="w-4 h-4 text-white" />
          </a>
          <a
            href={member.social.twitter}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-[#a57c00] transition-colors"
            aria-label="Twitter"
          >
            <Twitter className="w-4 h-4 text-white" />
          </a>
          <a
            href={member.social.email}
            className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-[#a57c00] transition-colors"
            aria-label="Email"
          >
            <Mail className="w-4 h-4 text-white" />
          </a>
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-lg text-[#1a3a2f] mb-1">{member.name}</h3>
        <p className="text-[#a57c00] text-sm font-medium mb-1">{member.role}</p>
        <p className="text-[#6a6a6a] text-sm">{member.specialty}</p>
      </div>
    </article>
  )

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const cards = entry.target.querySelectorAll(".team-card")
            cards.forEach((card, index) => {
              setTimeout(() => {
                card.classList.add("animate-in", "fade-in", "slide-in-from-bottom-4")
                card.classList.remove("opacity-0")
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

        <div ref={sectionRef} className="space-y-12">
          <div>
            <p className="text-center text-xs tracking-[0.18em] uppercase text-[#6a6a6a] mb-6">Leadership</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 justify-items-center">
              {seniorMembers.map((member, index) => renderTeamCard(member, index))}
            </div>
          </div>

          <div>
            <p className="text-center text-xs tracking-[0.18em] uppercase text-[#6a6a6a] mb-6">Core Team</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center">
              {otherMembers.map((member, index) =>
                renderTeamCard(member, index + seniorMembers.length),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
