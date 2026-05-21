'use client'

import { motion } from 'framer-motion'
import Image from "next/image"

interface HeroProps {
  subtitle: string
  title: string
  titleHighlight: string
  description: string
  buttonText: string
  backgroundImage?: string
}

export function Hero({
  subtitle,
  title,
  titleHighlight,
  description,
  buttonText,
  backgroundImage = '/background/background9.jpg',
}: HeroProps) {
  return (
    <section className="relative overflow-hidden min-h-screen">
      <div className="absolute inset-0 bg-[#e8e4de]">
        <Image
          src={backgroundImage}
          alt={`${subtitle} hero background`}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-20"
        />
      </div>
      <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 py-32 md:py-40 flex flex-col items-center justify-center text-center min-h-screen">
        {/* Accent line */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="h-px w-8 bg-[#a57c00]" />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium"
          >
            {subtitle}
          </motion.p>
          <div className="h-px w-8 bg-[#a57c00]" />
        </div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-serif font-light leading-tight mb-6 text-[#0d3d3d] text-balance"
        >
          {title}
          <br className="hidden sm:block" />
          <span className="text-[#a57c00]">{titleHighlight}</span>
        </motion.h1>

        {/* Sub-text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl max-w-2xl leading-relaxed font-light text-[#0d3d3d]"
        >
          {description}
        </motion.p>

        {/* CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-8 py-3 font-medium text-sm uppercase rounded-full tracking-wider transition-all bg-[#a57c00] text-[#f9f7f4] hover:bg-[#c99a00]"
          >
            {buttonText}
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
