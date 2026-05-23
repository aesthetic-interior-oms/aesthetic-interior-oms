"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"
import { motion } from "framer-motion"
import { Noto_Serif_Bengali } from "next/font/google"

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
})

const heroSlides = [
  {
    image: "/banner/Banner6.png",
    mobileImage: "/mobileBanner/mobileBanner1.jpeg",
    title: "Designing Spaces That Tell Your Story",
    subtitle: "Elevate your interior with timeless design and elegant aesthetics.",
  },
  {
    image: "/banner/Banner12.png",
    mobileImage: "/mobileBanner/mobileBanner2.jpeg",
    title: "Where Elegance Meets Functionality",
    subtitle: "Transform your vision into beautiful, livable spaces.",
  },
  {
    image: "/banner/Banner13.png",
    mobileImage: "/mobileBanner/mobileBanner3.jpeg",
    title: "Modern Design for Contemporary Living",
    subtitle: "Create environments that inspire and comfort.",
  },
  {
    image: "/banner/Banner4.png",
    mobileImage: "/mobileBanner/mobileBanner4.jpeg",
    title: "Modern Design for Contemporary Living",
    subtitle: "Create environments that inspire and comfort.",
  },
  {
    image: "/banner/Banner5.png",
    mobileImage: "/mobileBanner/mobileBanner1.jpeg",
    title: "Crafted Interiors with Lasting Impressions",
    subtitle: "Bring beauty, comfort, and purpose into every corner of your space.",
  },
]

function useCountUp(target: number, duration = 4500, decimals = 0) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    let start: number | null = null
    let frame = 0

    const step = (timestamp: number) => {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      setValue(target * progress)
      if (progress < 1) {
        frame = window.requestAnimationFrame(step)
      }
    }

    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [target, duration])

  return value.toFixed(decimals)
}

export function HomeHeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [showSiteTitle, setShowSiteTitle] = useState(false)
  const sectionRef = useRef<HTMLElement | null>(null)
  const siteTitleTimeout = useRef<number | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShowSiteTitle(true)
            if (siteTitleTimeout.current) {
              window.clearTimeout(siteTitleTimeout.current)
            }
            siteTitleTimeout.current = window.setTimeout(() => {
              setShowSiteTitle(false)
              siteTitleTimeout.current = null
            }, 5000)
          }
        })
      },
      { threshold: 0.2 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (siteTitleTimeout.current) {
        window.clearTimeout(siteTitleTimeout.current)
        siteTitleTimeout.current = null
      }
    }
  }, [])

  const goToSlide = (index: number) => setCurrentSlide(index)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)
  const activeSlide = heroSlides[currentSlide]
  const projectsCount = useCountUp(1000)
  const yearsCount = useCountUp(10)
  const ratingCount = useCountUp(4.9, 5200, 1)

  return (
    <section ref={sectionRef} className="relative min-h-screen w-full overflow-hidden pt-20">
      {heroSlides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-opacity duration-[1400ms] ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image || "/placeholder.svg"}
            alt={`${slide.title} interior design hero image`}
            fill
            priority={index === 0}
            sizes="100vw"
            className={`hidden lg:block h-full w-full object-cover transition-transform duration-[7000ms] ${
              index === currentSlide ? "scale-105" : "scale-100"
            }`}
          />
          <Image
            src={slide.mobileImage || slide.image || "/placeholder.svg"}
            alt={`${slide.title} interior design hero image`}
            fill
            priority={index === 0}
            sizes="100vw"
            className={`lg:hidden h-full w-full object-cover transition-transform duration-[7000ms] ${
              index === currentSlide ? "scale-105" : "scale-100"
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(165,124,0,0.25),transparent_42%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_45%)]" />
        </div>
      ))}

      <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center">
        <div className="mx-auto w-full max-w-7xl px-5 pb-14 pt-24 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={showSiteTitle ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
              className="mb-6 flex items-center justify-center gap-3"
            >
              <div className="h-px w-12 bg-[#c89f2f]/80" />
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/90 sm:text-sm">
                Aesthetic Interior Studio
              </p>
              <div className="h-px w-12 bg-[#c89f2f]/80" />
            </motion.div>

            <motion.p
              key={`bangla-tag-${currentSlide}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
              className={`${notoSerifBengali.className} mb-4 text-sm font-medium tracking-wide text-[#f2d487] sm:text-base`}
            >
              রুচিতে আভিজাত্য, ছোঁয়ায় ঐতিহ্য
            </motion.p>

            <motion.h1
              key={`title-${currentSlide}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="max-w-3xl font-serif text-[2rem] font-light leading-[1.15] text-white sm:text-5xl lg:text-7xl"
            >
              {activeSlide.title}
            </motion.h1>
            <motion.p
              key={`subtitle-${currentSlide}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-5 sm:text-lg lg:text-xl"
            >
              {activeSlide.subtitle}
            </motion.p>

            <motion.div
              key={`cta-${currentSlide}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="mt-8 flex w-full flex-col items-center gap-3 sm:mt-9 sm:w-auto sm:flex-row sm:gap-4"
            >
              <Link
                href="#services"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#a57c00] px-7 py-3.5 font-medium text-white transition-all duration-300 hover:bg-[#c99a00] sm:w-auto sm:px-8 sm:py-4"
              >
                Explore Services
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/60 bg-transparent px-7 py-3.5 font-medium text-white transition-all duration-300 hover:bg-white hover:text-[#0d3d3d] sm:w-auto sm:px-8 sm:py-4"
              >
                Get Consultation
              </Link>
            </motion.div>

            <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-4 p-0 sm:mt-10 sm:grid-cols-3 sm:gap-5 sm:rounded-2xl sm:border sm:border-white/20 sm:bg-white/10 sm:p-5 sm:backdrop-blur-md">
              <div>
                <p className="font-serif text-2xl text-white sm:text-3xl">{projectsCount}+</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/75 sm:text-sm">Projects Delivered</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-white sm:text-3xl">{yearsCount}+</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/75 sm:text-sm">Years of Experience</p>
              </div>
              <div>
                <p className="font-serif text-2xl text-white sm:text-3xl">{ratingCount}/5</p>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-white/75 sm:text-sm">Client Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/15 backdrop-blur-md transition-colors hover:bg-[#a57c00] lg:left-8 lg:flex"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6 text-white" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-white/15 backdrop-blur-md transition-colors hover:bg-[#a57c00] lg:right-8 lg:flex"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6 text-white" />
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-3 lg:bottom-8">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${
              index === currentSlide ? "w-8 bg-[#c89f2f]" : "w-2.5 bg-white/50 hover:bg-white/70"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
