'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function CTASection() {
  return (
    <section className="bg-[#0d3d3d] py-20 md:py-28 overflow-hidden">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">

        {/* Section Tag */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-4 text-sm font-medium uppercase tracking-widest text-[#a57c00]"
        >
          Ready to Transform Your Space?
        </motion.p>

        {/* Main Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mb-6 text-balance font-serif text-4xl font-light text-white md:text-5xl lg:text-6xl"
        >
          Let’s Design Your Perfect Home
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mx-auto mb-10 max-w-2xl text-lg font-light leading-relaxed text-white/75 md:text-xl"
        >
          Whether you're starting from scratch or reimagining an existing space,
          our team is ready to bring your vision to life. Let’s create a home that
          tells your story.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="flex flex-col justify-center gap-4 sm:flex-row"
        >
          <Link href="/contact">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-[#a57c00] px-8 py-3 font-medium text-white shadow-lg transition-colors hover:bg-[#c99a00]"
            >
              Book a Consultation
            </motion.button>
          </Link>

          <Link href="/projects">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="rounded-full border-2 border-[#a57c00] px-8 py-3 font-medium text-[#a57c00] transition-colors hover:bg-[#a57c00] hover:text-white"
            >
              View Our Portfolio
            </motion.button>
          </Link>
        </motion.div>

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 border-t border-white/20 pt-12"
        >
          <p className="mb-4 text-sm text-white/60">
            Have questions? Get in touch
          </p>

          <div className="space-y-2">
            <motion.a
              href="mailto:hello@aestheticinterior.com"
              whileHover={{ color: '#a57c00' }}
              className="block cursor-pointer font-medium text-white transition-colors"
            >
              hello@aestheticinterior.com
            </motion.a>

            <motion.a
              href="tel:+15551234567"
              whileHover={{ color: '#a57c00' }}
              className="block cursor-pointer text-white/70 transition-colors"
            >
              +1 (555) 123-4567
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
