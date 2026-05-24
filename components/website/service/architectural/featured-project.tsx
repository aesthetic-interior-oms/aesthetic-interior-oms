'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

export function FeaturedProject() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#a57c00]" />
            <p className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium">
              Featured Work
            </p>
            <div className="h-px w-8 bg-[#a57c00]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-light text-[#0d3d3d]">
            Featured Interior Architecture Project
          </h2>
        </div>

        {/* Featured Project Content */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-[#e8e4de] relative">
              <Image
                src="/luxury-residential-interior-living-room.jpg"
                alt="Featured living room interior design"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-[#0d3d3d]/0 hover:bg-[#0d3d3d]/10 transition-colors duration-300" />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 border-2 border-[#a57c00] rounded-lg -z-10" />
          </motion.div>

          {/* Details */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="space-y-6">
              {/* Project Meta */}
              <div className="flex flex-wrap gap-6">
                <div>
                  <p className="text-sm text-[#a57c00] uppercase tracking-wider mb-1">Project Type</p>
                  <p className="text-[#0d3d3d] font-medium">Commercial Interior</p>
                </div>
                <div>
                  <p className="text-sm text-[#a57c00] uppercase tracking-wider mb-1">Scope</p>
                  <p className="text-[#0d3d3d] font-medium">Interior Architectural Design</p>
                </div>
                <div>
                  <p className="text-sm text-[#a57c00] uppercase tracking-wider mb-1">Location</p>
                  <p className="text-[#0d3d3d] font-medium">Mumbai, India</p>
                </div>
              </div>

              {/* Design Focus */}
              <div>
                <p className="text-sm text-[#a57c00] uppercase tracking-wider mb-2">Design Focus</p>
                <p className="text-[#0d3d3d]/80 leading-relaxed">
                  Efficient planning, natural light integration, and built-in architectural elements that serve both form and function. Premium materials including marble flooring and custom millwork.
                </p>
              </div>

              {/* Description */}
              <p className="text-lg text-[#0d3d3d]/70 leading-relaxed">
                A carefully structured interior where every space serves a clear purpose. The design emphasizes clean sight lines, material continuity, and seamless transitions between zones. Featuring a contemporary entertainment wall with integrated fireplace and natural stone accents.
              </p>

              {/* Project Stats */}
              <div className="flex gap-8 py-4 border-y border-[#0d3d3d]/10">
                <div>
                  <p className="font-serif text-3xl text-[#0d3d3d]">450</p>
                  <p className="text-sm text-[#0d3d3d]/50">Sq. Ft.</p>
                </div>
                <div>
                  <p className="font-serif text-3xl text-[#0d3d3d]">2024</p>
                  <p className="text-sm text-[#0d3d3d]/50">Year</p>
                </div>
                <div>
                  <p className="font-serif text-3xl text-[#0d3d3d]">12</p>
                  <p className="text-sm text-[#0d3d3d]/50">Weeks</p>
                </div>
              </div>

              {/* CTA */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 text-[#a57c00] font-medium hover:text-[#c99a00] transition-colors mt-4"
              >
                View Full Project
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
