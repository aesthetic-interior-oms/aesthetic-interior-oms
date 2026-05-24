'use client'

import { motion } from 'framer-motion'

export function CommercialCTA() {
  return (
    <section className="py-24 lg:py-32 bg-[#f9f7f4] relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[#a57c00]/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#0d3d3d]/5 rounded-full translate-x-1/2 translate-y-1/2" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 text-center">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#a57c00]" />
            <p className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium">
              Start Your Project
            </p>
            <div className="h-px w-8 bg-[#a57c00]" />
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-[#0d3d3d] mb-6 leading-tight text-balance">
            {"Let's Build Spaces"} <span className="text-[#a57c00]">That Inspire Work</span>
          </h2>

          <p className="text-lg md:text-xl text-[#0d3d3d]/70 max-w-2xl mx-auto mb-10 leading-relaxed">
            {"Ready to elevate your commercial environment? Let's create a workspace that reflects your brand and empowers your team."}
          </p>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 font-medium text-sm uppercase rounded-full tracking-wider transition-all bg-[#a57c00] text-white hover:bg-[#c99a00]"
          >
            Get a Free Quote
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-4 font-medium text-sm uppercase rounded-full tracking-wider transition-all border-2 border-[#0d3d3d] text-[#0d3d3d] hover:bg-[#0d3d3d] hover:text-white"
          >
            Talk to Our Team
          </motion.button>
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-[#0d3d3d]/50"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#a57c00]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Free Initial Consultation</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#a57c00]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>Custom Design Solutions</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#a57c00]" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <span>End-to-End Support</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
