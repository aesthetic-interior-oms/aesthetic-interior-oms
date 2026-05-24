'use client'

import { motion } from 'framer-motion'
import { Building2, Store, Coffee, GraduationCap } from 'lucide-react'

const designTypes = [
  {
    icon: Building2,
    title: 'Office & Corporate Interiors',
    description: 'Workspaces designed for productivity, collaboration, and brand identity.',
    image: '/modern-corporate-office-interior-design.jpg',
  },
  {
    icon: Store,
    title: 'Retail & Showroom Spaces',
    description: 'Commercial environments that enhance customer experience and showcase products.',
    image: '/custom-furniture-design-showroom.jpg',
  },
  {
    icon: Coffee,
    title: 'Hospitality & F&B Interiors',
    description: 'Restaurants, cafes, and hospitality spaces with memorable atmospheres.',
    image: '/fine-dining-restaurant-interior-warm-lighting.jpg',
  },
  {
    icon: GraduationCap,
    title: 'Institutional & Educational',
    description: 'Learning environments that inspire and facilitate knowledge exchange.',
    image: '/modern-interior-design-studio-workspace-with-natur.jpg',
  },
]

export function DesignTypes() {
  return (
    <section className="py-24 lg:py-32 bg-[#f9f7f4]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#a57c00]" />
            <p className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium">
              Expertise
            </p>
            <div className="h-px w-8 bg-[#a57c00]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-light text-[#0d3d3d] mb-6">
            Interior Spaces We Design
          </h2>
          <p className="text-lg text-[#0d3d3d]/70 max-w-2xl mx-auto leading-relaxed">
            Each project is designed as a complete spatial system, tailored to the unique requirements of commercial environments.
          </p>
        </div>

        {/* Design Types Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {designTypes.map((type, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="group relative overflow-hidden rounded-lg"
            >
              {/* Background Image Placeholder */}
              <div className="aspect-[16/10] bg-[#e8e4de] relative">
                <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${type.image})` }}
                />
                {/* Placeholder overlay - remove when adding real images */}
                <div className="absolute inset-0 bg-[#0d3d3d]/20 flex items-center justify-center">
                  <span className="text-white/50 text-sm uppercase tracking-wider">
                    Image Placeholder
                  </span>
                </div>
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0d3d3d] via-[#0d3d3d]/50 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="flex items-center gap-3 mb-3">
                  <type.icon className="w-5 h-5 text-[#a57c00]" />
                  <h3 className="text-xl font-serif text-white">
                    {type.title}
                  </h3>
                </div>
                <p className="text-white/70 leading-relaxed">
                  {type.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
