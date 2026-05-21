"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

const services = [
  {
    id: 1,
    title: "Residential Design",
    description: "Create stunning home interiors that blend aesthetics with comfort. From modern minimalism to classic elegance, we design spaces that reflect your lifestyle.",
    href: "/services/residential",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 2,
    title: "Commercial Design",
    description: "Transform business spaces with professional design solutions. From corporate offices to retail environments, we create productive and inspiring workplaces.",
    href: "/services/commercial",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 3,
    title: "Architectural Design",
    description: "Conceptualize and plan spaces with precision. We blend architecture and interior design for cohesive, innovative environments that maximize functionality.",
    href: "/services/architectural",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-6 0v2m6-2v2m1 11H7m6 0v2m0-11v2" />
      </svg>
    ),
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
}

export function ServicesSection() {
  return (
    <section id="services" className="py-20 lg:py-32 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 lg:mb-20"
        >
          <p className="text-sm uppercase tracking-widest text-[#a57c00] font-medium mb-4">
            Our Expertise
          </p>
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-[#0d3d3d] font-light mb-6">
            Interior Design <span className="italic text-[#a57c00]">Services</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            From residential havens to commercial spaces, we deliver exceptional design solutions tailored to your needs.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              className="group relative bg-white border-2 border-gray-100 rounded-2xl p-8 lg:p-10 hover:border-[#a57c00] hover:shadow-2xl transition-all duration-500"
            >
              {/* Icon */}
              <div className="mb-8 inline-flex p-4 rounded-xl bg-gray-50 text-[#0d3d3d] group-hover:bg-[#a57c00] group-hover:text-white transition-all duration-500">
                {service.icon}
              </div>

              {/* Title */}
              <h3 className="font-serif text-2xl lg:text-3xl text-[#0d3d3d] mb-4 group-hover:text-[#a57c00] transition-colors duration-500">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-gray-600 text-base leading-relaxed mb-8 flex-grow group-hover:text-gray-700 transition-colors duration-500">
                {service.description}
              </p>

              {/* Link */}
              <Link
                href={service.href}
                className="inline-flex items-center gap-2 text-[#a57c00] hover:text-[#0d3d3d] font-medium transition-colors duration-300 group"
              >
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </Link>

              {/* Bottom Border Accent */}
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#a57c00] group-hover:w-full transition-all duration-500 rounded-b-2xl" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 lg:mt-20 text-center"
        >
          <p className="text-gray-600 mb-6 text-lg">
            Looking for a custom design solution?
          </p>
          <Link
            href="/services"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#0d3d3d] text-white rounded-full hover:bg-[#1a5a5a] transition-colors font-medium uppercase tracking-wider text-sm"
          >
            Start Your Project
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
