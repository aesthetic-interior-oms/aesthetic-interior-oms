'use client'

import { Hero } from '@/components/common/commonHero'
import { Noto_Serif_Bengali } from 'next/font/google'

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
})

export function CommercialHero() {
  return (
    <Hero
      subtitle="Commercial Interior Design"
      subtitleNote="রুচিতে আভিজাত্য, ছোঁয়ায় ঐতিহ্য"
      subtitleNotePosition="after-subtitle"
      subtitleNoteClassName={`${notoSerifBengali.className} text-[#f2d487] font-medium tracking-wide`}
      title="Designing Experiences"
      titleHighlight="Not Just Interiors"
      description="We create smart, scalable interior solutions for offices, retail, and commercial environments—balancing aesthetics, efficiency, and brand identity."
      buttonText="Explore Our Work"
      backgroundImage="/banner/Banner12.png"
    />
  )
}
