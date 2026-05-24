'use client'

import { Hero } from '@/components/common/commonHero'
import { Noto_Serif_Bengali } from 'next/font/google'

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
})

export function ServiceHero() {
  return (
    <Hero
      subtitle="Our Services"
      subtitleNote="রুচিতে আভিজাত্য, ছোঁয়ায় ঐতিহ্য"
      subtitleNotePosition="after-subtitle"
      subtitleNoteClassName={`${notoSerifBengali.className} text-[#f2d487] font-medium tracking-wide`}
      title="Complete Interior Design"
      titleHighlight="& Execution Service"
      description="We thoughtfully designed interiors that focus on luxury and lifestyle - From concept to flawless execution."
      buttonText="Explore Our Work"
      backgroundImage="/banner/Banner9.png"
    />
  )
}
