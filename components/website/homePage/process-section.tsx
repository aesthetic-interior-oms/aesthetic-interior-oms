"use client"

import { useRef } from "react"
import { motion, useScroll, useTransform, useInView } from "framer-motion"
import { useRouter } from "next/navigation"
import { Noto_Serif_Bengali } from "next/font/google"

import { ClipboardCheck, Handshake, Ruler, Settings, Sparkles } from "lucide-react"

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
})

interface ProcessStep {
  number: string
  title: string
  description: string
  icon: string
}

const processSteps: ProcessStep[] = [
  {
    number: "01",
    title: "Consultation",
    description:
      "একটি in-depth discussion-এর মাধ্যমে আমরা আপনার space, budget এবং design preferences বুঝে নিই।",
    icon: "consultation",
  },
  {
    number: "02",
    title: "Concept & Design",
    description:
      "আমাদের ডিজাইনাররা আপনার জন্য তৈরি করেন custom layouts, material selection এবং 3D visualizations।",
    icon: "design-drawing",
  },
  {
    number: "03",
    title: "Detailed Planning",
    description: "সবকিছু নিখুঁত রাখতে আমরা prepare করি detailed drawings, accurate budget এবং project timeline।",
    icon: "person-reading-map",
  },
  {
    number: "04",
    title: "Execution",
    description:
      "Production থেকে final installation—সবকিছু আমাদের expert team rigorous quality control-এর মাধ্যমে manage করে।",
    icon: "bricks",
  },
  {
    number: "05",
    title: "Handover",
    description: "আপনার beautifully finished space টিম বুঝিয়ে দেওয়া হয়, ready for you to live and work।",
    icon: "alms",
  },
]

function StepIcon({ icon, title }: { icon: string; title: string }) {
  const commonClass = "h-16 w-16 rounded-md flex items-center justify-center"
  const animationMap: Record<string, object> = {
    consultation: consultationAnimation,
    "design-drawing": designAnimation,
    "person-reading-map": planningAnimation,
    bricks: executionAnimation,
    alms: handoverAnimation,
  }
  const iconMap = {
    consultation: Handshake,
    "design-drawing": Sparkles,
    "person-reading-map": Ruler,
    bricks: Settings,
    alms: ClipboardCheck,
  } as const

  const animationData = animationMap[icon] ?? consultationAnimation
  const IconFallback = iconMap[icon as keyof typeof iconMap] ?? Sparkles

  return (
    <div className={`${commonClass} bg-white relative`} aria-label={`${title} icon`}>
      <Lottie
        animationData={animationData}
        loop
        autoplay
        className="absolute inset-0 h-full w-full opacity-80"
        rendererSettings={{ preserveAspectRatio: "xMidYMid meet" }}
      />
      <motion.div
        className="relative z-10"
        animate={{ scale: [0.95, 1, 0.97, 1], y: [0, -1.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <IconFallback className="h-8 w-8 text-[#0d3d3d]" strokeWidth={1.9} />
      </motion.div>
    </div>
  )
}

function MobileStep({ step, index }: { step: ProcessStep; index: number }) {
  const stepRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(stepRef, { once: false, margin: "-50px" })

  return (
    <motion.div
      ref={stepRef}
      className="flex gap-4"
      initial={{ opacity: 0, x: -30 }}
      animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <motion.div
          className="w-24 h-24 rounded-full bg-white border-2 border-[#a57c00] flex items-center justify-center shadow-lg relative"
          whileHover={{ scale: 1.08 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={isInView ? { scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-[#a57c00]"
          >
            <StepIcon icon={step.icon} title={step.title} />
          </motion.div>

          <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#a57c00] text-white text-xs font-bold flex items-center justify-center">
            {step.number.split("").pop()}
          </div>
        </motion.div>

        {index !== processSteps.length - 1 && (
          <motion.div
            className="w-1 bg-gradient-to-b from-[#a57c00]/30 to-transparent flex-1 mt-2 min-h-[60px]"
            initial={{ height: 0 }}
            animate={isInView ? { height: 60 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        )}
      </div>

      <motion.div
        className="flex-1 pt-2"
        initial={{ opacity: 0, x: 20 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className={`bg-white rounded-xl p-4 border border-[#0d3d3d]/10 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-[#a57c00]/35 transition-all duration-500 relative overflow-hidden group ${notoSerifBengali.className}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,61,61,0.08),transparent_40%)] opacity-70" />
          <div className="absolute -top-10 -left-10 h-24 w-24 rounded-full bg-[#a57c00]/10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
          <div className="absolute top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#a57c00] to-[#0d3d3d] group-hover:w-full transition-all duration-500" />
          <div className="absolute top-0 right-0 h-10 w-10 bg-[#a57c00]/10 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
          <h3 className="relative font-medium text-[#0d3d3d] mb-2 text-sm group-hover:text-[#a57c00] transition-colors">{step.title}</h3>
          <p className="relative text-[#0d3d3d]/60 text-xs leading-relaxed">{step.description}</p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function HorizontalFlow() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: false, margin: "-100px" })

  return (
    <div ref={containerRef} className="hidden lg:block">
      <div className="relative">
        <motion.div
          className="absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#a57c00]/30 to-transparent rounded-full"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{ duration: 1.5, delay: 0.3 }}
          style={{ originX: 0 }}
        />

        <div className="grid grid-cols-5 gap-4 relative z-10">
          {processSteps.map((step, index) => (
            <motion.div
              key={step.number}
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: index * 0.1 + 0.2 }}
            >
              <motion.div className="relative mb-8" whileHover={{ scale: 1.1 }}>
                <div className="w-32 h-32 rounded-full bg-white border-2 border-[#a57c00] flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer group">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={isInView ? { scale: 1, rotate: 0 } : {}}
                    transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                    className="group-hover:scale-110 transition-transform"
                  >
                    <StepIcon icon={step.icon} title={step.title} />
                  </motion.div>
                </div>

                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#a57c00] text-white text-xs font-bold flex items-center justify-center">
                  {step.number.split("").pop()}
                </div>
              </motion.div>

              <motion.div
                className="w-full h-full"
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.6, delay: index * 0.1 + 0.3 }}
              >
                <div className={`bg-white rounded-xl p-4 border border-[#0d3d3d]/10 shadow-sm hover:shadow-2xl hover:-translate-y-1.5 hover:border-[#a57c00]/45 transition-all duration-500 group h-full min-h-[170px] relative overflow-hidden ${notoSerifBengali.className}`}>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(13,61,61,0.08),transparent_42%)] opacity-70" />
                  <div className="absolute -top-14 -left-14 h-28 w-28 rounded-full bg-[#a57c00]/10 blur-2xl group-hover:scale-125 transition-transform duration-700" />
                  <div className="absolute top-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#a57c00] to-[#0d3d3d] group-hover:w-full transition-all duration-500" />
                  <div className="absolute inset-y-0 -left-24 w-12 rotate-12 bg-white/40 blur-md group-hover:left-[120%] transition-all duration-700" />
                  <div className="absolute top-0 right-0 h-12 w-12 bg-[#a57c00]/10 [clip-path:polygon(100%_0,0_0,100%_100%)]" />
                  <h3 className="relative font-medium text-[#0d3d3d] mb-2 text-sm group-hover:text-[#a57c00] transition-colors">
                    {step.title}
                  </h3>
                  <p className="relative text-[#0d3d3d]/60 text-xs leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}

function VerticalFlow() {
  return (
    <div className="lg:hidden space-y-6">
      {processSteps.map((step, index) => (
        <MobileStep key={step.number} step={step} index={index} />
      ))}
    </div>
  )
}

export function ProcessSection() {
  const containerRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const isHeaderInView = useInView(headerRef, { once: true })
  const router = useRouter()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"])

  return (
    <section ref={containerRef} className="py-24 lg:py-32 bg-card relative overflow-hidden">
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 opacity-[0.02]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, #0d3d3d 1px, transparent 0)",
            backgroundSize: "50px 50px",
          }}
        />
      </motion.div>

      <div className="mx-auto max-w-6xl px-6 lg:px-8 relative z-10">
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
                aria-hidden="true"
                className="h-px bg-[#a57c00]"
              />
              <p className="text-[#0d3d3d] text-sm uppercase tracking-widest font-medium">How We Work</p>
              <motion.div
                initial={{ width: 0 }}
                animate={isHeaderInView ? { width: 32 } : {}}
                transition={{ duration: 0.6, delay: 0.2 }}
                aria-hidden="true"
                className="h-px bg-[#a57c00]"
              />
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 }}
            className={`${notoSerifBengali.className} mb-5 text-base font-medium tracking-wide text-[#a57c00]`}
          >
            নকশা থেকে বাস্তবায়ন, প্রতিটি ধাপে যত্ন
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl font-serif font-light text-[#0d3d3d] mb-6"
          >
            Our Design
            <br />
            <span className="italic text-[#a57c00]">Process</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-[#0d3d3d]/60 max-w-2xl mx-auto leading-relaxed text-lg"
          >
            A structured approach to transforming spaces, from initial concept to final execution.
          </motion.p>
        </div>

        <HorizontalFlow />
        <VerticalFlow />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-20"
        >
          <p className="text-[#0d3d3d]/60 mb-6">Ready to start your project?</p>
          <motion.button
            onClick={() => router.push("/how-we-work")}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#0d3d3d] text-white rounded-full hover:bg-[#0d3d3d]/90 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-[#a57c00] focus:ring-offset-2"
            aria-label="Start your design journey"
          >
            Start Your Journey
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
