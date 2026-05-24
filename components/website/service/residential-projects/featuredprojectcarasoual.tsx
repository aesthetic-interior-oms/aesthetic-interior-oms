'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

const featuredProjects = [
  {
    id: 1,
    title: 'Minimalist Workspace',
    location: 'Modern Aesthetic',
    type: 'Study',
    description:
      'A refined workspace featuring floating shelves, warm lighting, and carefully curated minimalist design elements.',
    images: ['/images/info24.jpg'],
    features: ['Floating Storage', 'Warm Lighting', 'Minimalist Design']
  },
  {
    id: 2,
    title: 'Luxury Dressing Room',
    location: 'Contemporary Elegance',
    type: 'Bedroom',
    description:
      'An immaculate dressing space with marble accents, integrated lighting, and organized storage solutions.',
    images: ['/images/info21.jpg'],
    features: ['Marble Accents', 'Smart Storage', 'Elegant Lighting']
  },
  {
    id: 3,
    title: 'Modern Dining Suite',
    location: 'Open Plan Living',
    type: 'Dining',
    description:
      'An expansive dining area with black cabinetry, marble surfaces, and sophisticated modern furnishings.',
    images: ['/images/info16.jpg'],
    features: ['Black Cabinetry', 'Marble Table', 'Open Layout']
  },
  {
    id: 4,
    title: 'Master Bedroom Suite',
    location: 'Warm Minimalism',
    type: 'Bedroom',
    description:
      'A serene bedroom with walk-in wardrobe, warm wood tones, and ambient lighting creating a luxurious retreat.',
    images: ['/images/info22.jpg'],
    features: ['Walk-in Wardrobe', 'Warm Tones', 'Ambient Lighting']
  },
  {
    id: 5,
    title: 'Contemporary Bedroom',
    location: 'Soft Elegance',
    type: 'Bedroom',
    description:
      'A minimal bedroom with soft neutral palette, modern wardrobe system, and understated luxury throughout.',
    images: ['/images/info20.jpg'],
    features: ['Modern Wardrobe', 'Neutral Palette', 'Premium Materials']
  }
]

export function FeaturedProjectsCarousel() {
  const [activeProject, setActiveProject] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const sections = containerRef.current.querySelectorAll('[data-project]')
      const scrollY = window.scrollY

      sections.forEach((section, idx) => {
        const element = section as HTMLElement
        const rect = element.getBoundingClientRect()
        
        // Check if section is in viewport center
        if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
          setActiveProject(idx)
        }
      })
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={containerRef} className="relative bg-white">
      {/* Header Section */}
      <motion.section className="relative min-h-screen flex items-center justify-center py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[#a57c00] text-xs uppercase tracking-widest font-medium mb-6"
          >
            Featured Collection
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="text-6xl md:text-7xl lg:text-8xl font-serif font-light text-[#0d3d3d] mb-8 text-balance"
          >
            Luxury Interior Design
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-lg md:text-xl text-[#0d3d3d]/60 font-light max-w-2xl mx-auto"
          >
            Explore our curated selection of premium residential projects crafted with meticulous attention to detail
          </motion.p>
          
          {/* Scroll indicator */}
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mt-16 flex flex-col items-center gap-2"
          >
            <p className="text-[#0d3d3d]/40 text-xs uppercase tracking-widest">Scroll to begin</p>
            <div className="w-px h-6 bg-gradient-to-b from-[#a57c00] to-transparent" />
          </motion.div>
        </div>
      </motion.section>

      {/* Project Sections */}
      {featuredProjects.map((project, idx) => (
        <motion.section
          key={project.id}
          data-project={idx}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="relative min-h-screen flex items-center py-20 px-6"
        >
          <div className="mx-auto max-w-7xl w-full">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
              {/* Image - alternating sides */}
              <motion.div
                initial={{ opacity: 0, x: idx % 2 === 0 ? -60 : 60 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className={cn('order-2 lg:order-none', idx % 2 === 1 && 'lg:order-2')}
              >
                <motion.div className="relative h-96 md:h-[600px] rounded-xl overflow-hidden group">
                  <motion.img
                    src={project.images[0]}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    whileHover={{ scale: 1.04 }}
                    transition={{ duration: 0.6 }}
                  />
                  {/* Subtle overlay */}
                  <motion.div
                    className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500"
                  />
                </motion.div>
              </motion.div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0, x: idx % 2 === 0 ? 60 : -60 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.1 }}
                className={cn('order-1 lg:order-none', idx % 2 === 1 && 'lg:order-1')}
              >
                <div className="space-y-8">
                  {/* Counter */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-4"
                  >
                    <p className="text-[#a57c00] text-sm font-light tracking-widest font-mono">
                      {String(idx + 1).padStart(2, '0')} / {String(featuredProjects.length).padStart(2, '0')}
                    </p>
                    <div className="h-px flex-grow bg-[#a57c00]/30" />
                  </motion.div>

                  {/* Title Section */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <p className="text-[#a57c00] text-xs uppercase tracking-widest font-medium">
                      {project.type}
                    </p>
                    <h2 className="text-5xl md:text-6xl font-serif font-light text-[#0d3d3d] leading-tight">
                      {project.title}
                    </h2>
                    <p className="text-[#0d3d3d]/50 font-light">{project.location}</p>
                  </motion.div>

                  {/* Description */}
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-lg text-[#0d3d3d]/70 leading-relaxed font-light pr-4"
                  >
                    {project.description}
                  </motion.p>

                  {/* Features */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="pt-6 space-y-3"
                  >
                    {project.features.map((feature, fidx) => (
                      <motion.div
                        key={fidx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + fidx * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        <motion.div className="w-1.5 h-1.5 bg-[#a57c00] rounded-full" />
                        <span className="text-[#0d3d3d]/80 font-light">{feature}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Progress indicator - bottom of section */}
          <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1.5">
            {featuredProjects.map((_, dotIdx) => (
              <motion.div
                key={dotIdx}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  activeProject === dotIdx ? 'bg-[#a57c00] w-6' : 'bg-[#a57c00]/20 w-1.5'
                )}
              />
            ))}
          </motion.div>
        </motion.section>
      ))}

      {/* Footer Section */}
      <motion.section className="relative min-h-screen flex items-center justify-center py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h3 className="text-5xl md:text-6xl font-serif font-light text-[#0d3d3d]">
              Ready to Transform Your Space?
            </h3>
            <p className="text-lg text-[#0d3d3d]/60 font-light">
              Explore how our design expertise can elevate your residential project
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-8 px-8 py-4 bg-[#a57c00] text-white rounded-full hover:bg-[#8a6600] transition-colors duration-300 font-light"
            >
              Get in Touch
            </motion.button>
          </motion.div>
        </div>
      </motion.section>
    </div>
  )
}
