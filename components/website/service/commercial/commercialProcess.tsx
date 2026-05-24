'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'

const processSteps = [
  {
    number: '01',
    title: 'Consultation & Requirement Analysis',
    description: 'We begin by understanding your business goals, workflow, space usage, budget, and timeline.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Space Planning & Concept Design',
    description: 'Our team develops layout plans and design concepts focused on efficiency, branding, and compliance.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Design Finalization & Budget Approval',
    description: 'Materials, finishes, and technical details are finalized, followed by a transparent project budget.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    number: '04',
    title: 'Execution & Site Management',
    description: 'Our project team manages production, installation, and on-site coordination with strict quality control.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    number: '05',
    title: 'Quality Check & Handover',
    description: 'Multiple quality inspections ensure everything meets design, safety, and functional standards before delivery.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  {
    number: '06',
    title: 'Post-Handover Support',
    description: 'We remain available for support, maintenance guidance, and future upgrades.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
]

function TimelineStep({ step, index, isLast }: { step: typeof processSteps[0]; index: number; isLast: boolean }) {
  const stepRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(stepRef, { once: false, margin: "-100px" })
  
  const isEven = index % 2 === 0

  return (
    <div ref={stepRef} className="relative">
      {/* Mobile Layout */}
      <div className="lg:hidden flex gap-6">
        {/* Timeline Line & Node */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10 w-16 h-16 rounded-full bg-white border-2 border-[#a57c00] flex items-center justify-center shadow-lg"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={isInView ? { scale: 1 } : { scale: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="text-[#a57c00]"
            >
              {step.icon}
            </motion.div>
          </motion.div>
          {!isLast && (
            <motion.div
              initial={{ height: 0 }}
              animate={isInView ? { height: "100%" } : { height: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-0.5 bg-gradient-to-b from-[#a57c00] to-[#a57c00]/20 flex-1 min-h-[80px]"
            />
          )}
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 30 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex-1 pb-12"
        >
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0d3d3d]/5 hover:shadow-lg hover:border-[#a57c00]/20 transition-all duration-300">
            <span className="text-[#a57c00] font-serif text-4xl opacity-20">{step.number}</span>
            <h3 className="text-xl font-serif text-[#0d3d3d] mt-2 mb-3">{step.title}</h3>
            <p className="text-[#0d3d3d]/60 leading-relaxed text-sm">{step.description}</p>
          </div>
        </motion.div>
      </div>

      {/* Desktop Layout - Alternating Sides */}
      <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] gap-8 items-start">
        {/* Left Content */}
        <div className={`${isEven ? 'text-right' : ''}`}>
          {isEven && (
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-[#0d3d3d]/5 hover:shadow-xl hover:border-[#a57c00]/30 transition-all duration-500 group"
            >
              <motion.span 
                className="text-[#a57c00] font-serif text-6xl opacity-10 group-hover:opacity-30 transition-opacity"
              >
                {step.number}
              </motion.span>
              <h3 className="text-2xl font-serif text-[#0d3d3d] mt-2 mb-4 group-hover:text-[#a57c00] transition-colors">
                {step.title}
              </h3>
              <p className="text-[#0d3d3d]/60 leading-relaxed">{step.description}</p>
              
              {/* Decorative Line */}
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: 60 } : { width: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="h-0.5 bg-[#a57c00] mt-6 ml-auto"
              />
            </motion.div>
          )}
        </div>

        {/* Center Timeline */}
        <div className="flex flex-col items-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative z-10"
          >
            {/* Outer Ring Animation */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={isInView ? { scale: [0.8, 1.2, 1], opacity: [0, 0.5, 0] } : {}}
              transition={{ duration: 1, delay: 0.3, repeat: isInView ? Infinity : 0, repeatDelay: 2 }}
              className="absolute inset-0 rounded-full border-2 border-[#a57c00]"
            />
            
            <div className="w-20 h-20 rounded-full bg-white border-2 border-[#a57c00] flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-300 cursor-pointer group">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={isInView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="text-[#a57c00] group-hover:text-[#c99a00] transition-colors"
              >
                {step.icon}
              </motion.div>
            </div>
          </motion.div>
          
          {!isLast && (
            <motion.div
              initial={{ height: 0 }}
              animate={isInView ? { height: 120 } : { height: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="w-0.5 bg-gradient-to-b from-[#a57c00] to-[#a57c00]/20 mt-4"
            />
          )}
        </div>

        {/* Right Content */}
        <div className={`${!isEven ? '' : ''}`}>
          {!isEven && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-[#0d3d3d]/5 hover:shadow-xl hover:border-[#a57c00]/30 transition-all duration-500 group"
            >
              <motion.span 
                className="text-[#a57c00] font-serif text-6xl opacity-10 group-hover:opacity-30 transition-opacity"
              >
                {step.number}
              </motion.span>
              <h3 className="text-2xl font-serif text-[#0d3d3d] mt-2 mb-4 group-hover:text-[#a57c00] transition-colors">
                {step.title}
              </h3>
              <p className="text-[#0d3d3d]/60 leading-relaxed">{step.description}</p>
              
              {/* Decorative Line */}
              <motion.div
                initial={{ width: 0 }}
                animate={isInView ? { width: 60 } : { width: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="h-0.5 bg-[#a57c00] mt-6"
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export function CommercialProcess() {
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const isHeaderInView = useInView(headerRef, { once: true })

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <section ref={containerRef} className="py-24 lg:py-32 bg-[#f9f7f4] relative overflow-hidden">
      {/* Background Pattern */}
      <motion.div 
        style={{ y: backgroundY }}
        className="absolute inset-0 opacity-[0.02]"
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #0d3d3d 1px, transparent 0)",
            backgroundSize: "50px 50px",
          }}
        />
      </motion.div>

      <div className="mx-auto max-w-6xl px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div ref={headerRef} className="text-center mb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <motion.div 
                initial={{ width: 0 }}
                animate={isHeaderInView ? { width: 32 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-px bg-[#a57c00]" 
              />
              <p className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium">
                How We Work
              </p>
              <motion.div 
                initial={{ width: 0 }}
                animate={isHeaderInView ? { width: 32 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="h-px bg-[#a57c00]" 
              />
            </div>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-[#0d3d3d] mb-6"
          >
            Our Commercial Design
            <br />
            <span className="italic text-[#a57c00]">Process</span>
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[#0d3d3d]/60 max-w-2xl mx-auto leading-relaxed text-lg"
          >
            A structured approach to transforming commercial spaces, from consultation to handover.
          </motion.p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical Line - Desktop Only (Behind content) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-[#a57c00]/10 -translate-x-1/2" />

          <div className="space-y-8 lg:space-y-0">
            {processSteps.map((step, index) => (
              <TimelineStep 
                key={index} 
                step={step} 
                index={index} 
                isLast={index === processSteps.length - 1} 
              />
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <p className="text-[#0d3d3d]/60 mb-6">Ready to transform your commercial space?</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#0d3d3d] text-white rounded-full hover:bg-[#0d3d3d]/90 transition-colors font-medium"
          >
            Schedule a Consultation
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
