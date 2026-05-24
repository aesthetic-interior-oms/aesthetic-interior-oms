"use client"

import { Quote } from "lucide-react"
import { useEffect, useRef } from "react"
import Image from "next/image"
import { Noto_Serif_Bengali } from "next/font/google"

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
})

const testimonials = [
  {
    quote: "তাদের কাজ খুব ভালো লেগেছে। সব কিছু সময়মতো শেষ করেছে।",
    author: "Siam Hossain",
    project: "Residential Project",
    image: "/client agreement/Client-agreement1.jpg",
  },
  {
    quote: "আমাদের বাসা এখন অনেক সুন্দর আর গুছানো লাগছে।",
    author: "Nafiz Islam",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement2.jpg",
  },
  {
    quote: "ডিজাইন আর কাজ দুটোই দারুণ হয়েছে।",
    author: "Raihan Kabir",
    project: "Commercial Project",
    image: "/client agreement/Client-agreement3.jpg",
  },
  {
    quote: "তারা আমাদের জায়গাটাকে খুব সুন্দরভাবে সাজিয়ে দিয়েছে।",
    author: "Tanvir Hasan",
    project: "Residential Project",
    image: "/client agreement/Client-agreement4.jpg",
  },
  {
    quote: "শুরু থেকে শেষ পর্যন্ত কাজের অভিজ্ঞতা খুব ভালো ছিল।",
    author: "Shakib Anwar",
    project: "Residential Project",
    image: "/client agreement/Client-agreement5.jpg",
  },
  {
    quote: "ডিজাইনটা আমাদের পছন্দমতো হয়েছে, ব্যবহারেও অনেক সুবিধা।",
    author: "Mahin Chowdhury",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement12.jpg",
  },
  {
    quote: "ছোট ছোট বিষয়েও তারা খুব যত্ন নিয়েছে।",
    author: "Sabbir Rahman",
    project: "Architectural Design",
    image: "/client agreement/Client-agreement7.jpg",
  },
  {
    quote: "যেমনটা চেয়েছিলাম, ঠিক তেমনটাই পেয়েছি।",
    author: "Ishraq Mahmud",
    project: "Residential Project",
    image: "/client agreement/Client-agreement15.jpg",
  },
  {
    quote: "স্পেস প্ল্যানিংটা খুব সুন্দর হয়েছে, সবকিছু মানানসই।",
    author: "Arafat Karim",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement9.jpg",
  },
  {
    quote: "প্রতিটি ধাপে তারা আমাদের ভালোভাবে গাইড করেছে।",
    author: "Mehedi Hasan",
    project: "Commercial Project",
    image: "/client agreement/Client-agreement10.jpg",
  },
  {
    quote: "ফাইনাল কাজটা খুব পরিষ্কার আর ব্যবহারযোগ্য হয়েছে।",
    author: "Rakib Uddin",
    project: "Residential Project",
    image: "/client agreement/Client-agreement11.jpg",
  },
  {
    quote: "আইডিয়া, যোগাযোগ আর ফিনিশিং সবকিছুই চমৎকার ছিল।",
    author: "Fahim Reza",
    project: "3D Design",
    image: "/client agreement/Client-agreement12.jpg",
  },
  {
    quote: "আলোচনার মতোই কাজ হয়েছে, আমরা খুব সন্তুষ্ট।",
    author: "Shafin Ahmed",
    project: "Appartment Project",
    image: "/client agreement/Client-agreement11.jpg",
  },
]
export function TestimonialsSection() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef(0.5) // normal speed

  useEffect(() => {
    const container = scrollRef.current
    if (!container) return

    let scrollPosition = 0
    let animationId: number

    const animate = () => {
      scrollPosition += speedRef.current

      if (scrollPosition >= container.scrollWidth / 2) {
        scrollPosition = 0
      }

      container.scrollLeft = scrollPosition
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)

    const handleMouseEnter = () => {
      speedRef.current = 0.15 // slow on hover
    }

    const handleMouseLeave = () => {
      speedRef.current = 0.5 // back to normal
    }

    container.addEventListener("mouseenter", handleMouseEnter)
    container.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      cancelAnimationFrame(animationId)
      container.removeEventListener("mouseenter", handleMouseEnter)
      container.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return (
    <section className="py-20 lg:py-32 bg-card border-t border-border overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-12 text-center">
        <span className="text-sm uppercase tracking-widest text-[#a57c00]">
          Testimonials
        </span>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-[#0d3d3d]">
          What our clients say
        </h2>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-8 overflow-hidden px-6 lg:px-8"
      >
        {[...testimonials, ...testimonials].map((t, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-80 md:w-96 p-6 bg-white/90 backdrop-blur-md rounded-lg shadow-lg text-center"
          >
            <Image
              src={t.image}
              alt={`${t.author} testimonial project photo`}
              width={640}
              height={384}
              sizes="(max-width: 768px) 320px, 384px"
              loading="lazy"
              className="w-full h-48 object-cover object-top rounded-lg mb-4"
            />

            <Quote className="h-6 w-6 text-[#a57c00]/40 mx-auto mb-4" />

            <p
              className={`${notoSerifBengali.className} text-gray-800 text-[17px] leading-8 font-medium tracking-wide break-words`}
            >
              “{t.quote}”
            </p>

            <div className="mt-4 pt-4 border-t border-border">
              <span className="font-medium text-[#0d3d3d]">{t.author}</span>
              <span className="block text-sm text-gray-500 mt-1">
                {t.project}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
