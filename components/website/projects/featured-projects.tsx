"use client"

import { useState } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const featuredProjects = [
  {
    id: 1,
    title: "The Modern Family Home",
    location: "Dhaka, Bangladesh",
    type: "Residential",
    description:
      "A complete home transformation featuring an open-plan living space, custom furniture, and a harmonious blend of modern and traditional elements. The design prioritizes natural light and seamless indoor-outdoor flow.",
    images: ["/images/info1.jpg", "/images/info12.jpg", "/images/info13.jpg"],
  },
  {
    id: 2,
    title: "Luxury Apartment Makeover",
    location: "Chittagong, Bangladesh",
    type: "Renovation",
    description:
      "A stunning renovation of a 3BHK apartment, featuring bespoke wardrobes, ambient lighting systems, and premium finishes throughout. Every corner reflects attention to detail and sophisticated taste.",
    images: ["/images/info23.jpg", "/images/info25.jpg", "/images/info20.jpg"],
  },
  {
    id: 3,
    title: "Executive Dining Suite",
    location: "Sylhet, Bangladesh",
    type: "Residential",
    description:
      "An elegant dining space designed for entertaining, featuring marble dining table, custom glass cabinets, and sophisticated lighting. The perfect blend of luxury and functionality for modern families.",
    images: ["/images/info16.jpg", "/images/info8.jpg", "/images/info11.jpg"],
  },
  {
    id: 4,
    title: "Designer Walk-in Closet",
    location: "Rajshahi, Bangladesh",
    type: "Furniture",
    description:
      "A premium walk-in wardrobe system with glass display doors, integrated LED lighting, and custom wood shelving. Designed to maximize storage while maintaining an open, luxurious feel.",
    images: ["/images/info15.jpg", "/images/info22.jpg"],
  },
]

export function FeaturedProjects() {
  const [currentProject, setCurrentProject] = useState(0)
  const [currentImage, setCurrentImage] = useState(0)

  const project = featuredProjects[currentProject]

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % project.images.length)
  }

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + project.images.length) % project.images.length)
  }

  return (
    <section className="py-16 md:py-24 bg-[#0d3d3d]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <p className="text-[#a57c00] text-sm uppercase tracking-widest mb-3 font-medium">Highlights</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white text-balance">
            Featured Projects
          </h2>
          <p className="text-white/60 mt-4 max-w-2xl mx-auto leading-relaxed">
            Explore our most prestigious projects across Bangladesh, showcasing exceptional craftsmanship and design
            excellence.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image Carousel */}
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden group">
            <Image
              src={project.images[currentImage] || "/placeholder.svg"}
              alt={`${project.title} featured project image`}
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="w-full h-full object-cover transition-transform duration-700"
            />

            {/* Navigation Arrows */}
            <div className="absolute inset-0 flex items-center justify-between p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={prevImage}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/40 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Image Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {project.images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    currentImage === idx ? "bg-[#a57c00] w-6" : "bg-white/50",
                  )}
                />
              ))}
            </div>
          </div>

          {/* Project Details */}
          <div>
            <span className="text-[#a57c00] text-xs uppercase tracking-widest font-medium">{project.type}</span>
            <h3 className="text-2xl md:text-3xl font-serif font-light text-white mt-3">{project.title}</h3>
            <p className="text-white/60 text-sm mt-2">{project.location}</p>
            <p className="text-white/80 leading-relaxed mt-6">{project.description}</p>

            {/* Project Selector */}
            <div className="flex flex-wrap gap-3 mt-8">
              {featuredProjects.map((proj, idx) => (
                <button
                  key={proj.id}
                  onClick={() => {
                    setCurrentProject(idx)
                    setCurrentImage(0)
                  }}
                  className={cn(
                    "px-4 py-2 text-sm rounded-full transition-all",
                    currentProject === idx
                      ? "bg-[#a57c00] text-white"
                      : "border border-white/30 text-white/70 hover:border-[#a57c00] hover:text-[#a57c00]",
                  )}
                >
                  {proj.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
