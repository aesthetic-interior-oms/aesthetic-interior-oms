'use client'

import { Hero } from "@/components/common/commonHero"
import { Noto_Serif_Bengali } from "next/font/google"

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600"],
})


export function ArchitecturalHero() {
  return (
    <Hero
      subtitle="Architectural Interior Design"
      subtitleNote="রুচিতে আভিজাত্য, ছোঁয়ায় ঐতিহ্য"
      subtitleNotePosition="after-subtitle"
      subtitleNoteClassName={`${notoSerifBengali.className} text-[#f2d487] font-medium tracking-wide`}
      title="Modern Design for "
      titleHighlight="Contemporary Living"
      description="We transforms spaces into environments that are both functional and emotionally engaging."
      buttonText="Explore Service"
      backgroundImage="/banner/Banner11.png"
    />
  )
}
