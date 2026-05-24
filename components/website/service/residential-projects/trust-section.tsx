'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

function AnimatedCounter({ from, to, duration = 2 }: { from: number; to: number; duration?: number }) {
  const [count, setCount] = useState(from)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = (timestamp - startTime) / (duration * 1000)

      if (progress < 1) {
        setCount(Math.floor(from + (to - from) * progress))
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(to)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [from, to, duration])

  return <span>{count}</span>
}

export function TrustSection() {
  return (
    <section className="relative py-20 md:py-32 bg-white overflow-x-hidden">
      {/* Sketch background */}
      <div 
        className="absolute -right-32 top-1/3 w-80 h-80 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/interior-design-room-layout-sketch-pencil-drawing.jpg)',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          zIndex: 1
        }}
      />
      
      <div className="mx-auto max-w-4xl px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <p className="text-[#a57c00] text-sm uppercase tracking-widest font-medium mb-4">
            Our Impact
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-[#0d3d3d] text-balance">
            Trusted by Homeowners Nationwide
          </h2>
        </motion.div>

        {/* Stats Grid - Centered */}
        <div className="grid md:grid-cols-2 gap-16 md:gap-20 max-w-4xl mx-auto">
          {/* Stat 1 - Projects */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-8">
              <motion.div 
                className="flex items-baseline gap-2 justify-center"
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <span className="text-7xl md:text-8xl font-serif font-light text-[#a57c00]">
                  <AnimatedCounter from={0} to={1000} duration={2} />
                </span>
                <span className="text-3xl md:text-4xl text-[#a57c00] font-light">+</span>
              </motion.div>
              <motion.div 
                className="absolute -top-4 right-0 w-2 h-2 bg-[#a57c00] rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-light text-[#0d3d3d] mb-3 text-center">
              Projects Completed
            </h3>
            <p className="text-[#0d3d3d]/70 leading-relaxed text-center">
              From intimate apartments to sprawling homes, we've transformed over a thousand residential spaces with precision and care.
            </p>
          </motion.div>

          {/* Stat 2 - Client Trust */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-8">
              <motion.div 
                className="flex items-baseline gap-2 justify-center"
                whileInView={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <span className="text-7xl md:text-8xl font-serif font-light text-[#a57c00]">
                  <AnimatedCounter from={0} to={95} duration={2} />
                </span>
                <span className="text-3xl md:text-4xl text-[#a57c00] font-light">%</span>
              </motion.div>
              <motion.div 
                className="absolute -top-4 right-0 w-2 h-2 bg-[#a57c00] rounded-full"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <h3 className="text-2xl md:text-3xl font-serif font-light text-[#0d3d3d] mb-3 text-center">
              Client Satisfaction
            </h3>
            <p className="text-[#0d3d3d]/70 leading-relaxed text-center">
              Nearly all our clients recommend us to friends and family. Our commitment to quality and attention to detail speaks for itself.
            </p>
          </motion.div>
        </div>

        {/* Decorative line */}
        <motion.div 
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 md:mt-24 h-px bg-gradient-to-r from-transparent via-[#a57c00]/30 to-transparent origin-center"
        />

        {/* Bottom message */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-16 md:mt-20 text-center"
        >
          <p className="text-[#0d3d3d]/80 text-lg leading-relaxed max-w-2xl mx-auto">
            Every project is a partnership. We listen, we understand, and we create spaces that exceed expectations. Your home deserves nothing less.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
