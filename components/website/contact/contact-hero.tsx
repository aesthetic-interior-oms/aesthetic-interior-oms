"use client"

import { motion } from "framer-motion"
import Image from "next/image"

export function ContactHero() {
  return (
    <section className="relative w-full pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 -z-10">
        <Image
          src="/custom-bespoke-furniture-wooden-craftsmanship.jpg"
          alt="Custom bespoke furniture craftsmanship in an interior design studio"
          fill
          priority
          sizes="100vw"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/50" />
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl"
        >
          <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight text-balance">
            Let's Create <br /> Something Beautiful
          </h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 leading-relaxed max-w-xl">
            We'd love to hear about your project and discuss how we can transform your space into something extraordinary.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
