'use client'

import { motion } from 'framer-motion'
import { Ruler, Layout, Layers, Lightbulb, PenTool, FileText } from 'lucide-react'

const services = [
  {
    icon: Ruler,
    title: 'Site Measurement & Spatial Analysis',
    description: 'Comprehensive site documentation and analysis of existing conditions.',
  },
  {
    icon: Layout,
    title: 'Interior Layout Planning & Zoning',
    description: 'Strategic space planning that optimizes flow and functionality.',
  },
  {
    icon: Layers,
    title: 'Ceiling, Wall & Floor Systems',
    description: 'Integrated architectural systems for cohesive interior environments.',
  },
  {
    icon: Lightbulb,
    title: 'Lighting & Material Coordination',
    description: 'Thoughtful selection and coordination of materials and lighting design.',
  },
  {
    icon: PenTool,
    title: 'Built-in Architectural Detailing',
    description: 'Custom millwork and built-in elements designed for each space.',
  },
  {
    icon: FileText,
    title: 'Technical Drawings & Documentation',
    description: 'Complete documentation for seamless project execution.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export function ServiceOverview() {
  return (
    <section className="py-24 lg:py-32 bg-[#0d3d3d]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#a57c00]" />
            <p className="text-[#a57c00] text-sm uppercase tracking-widest font-medium">
              What We Offer
            </p>
            <div className="h-px w-8 bg-[#a57c00]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-serif font-light text-white mb-6">
            Interior Architecture Services
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            Our service focuses on architectural planning and technical interior design for commercial spaces.
          </p>
        </div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group p-8 rounded-lg bg-white/5 hover:bg-white/10 transition-colors duration-300"
            >
              <div className="w-12 h-12 rounded-full bg-[#a57c00]/20 flex items-center justify-center mb-6 group-hover:bg-[#a57c00]/30 transition-colors">
                <service.icon className="w-6 h-6 text-[#a57c00]" />
              </div>
              <h3 className="text-xl font-serif text-white mb-3">
                {service.title}
              </h3>
              <p className="text-white/60 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
