'use client'

import { Hero } from '@/components/common/commonHero'
import { Noto_Serif_Bengali } from 'next/font/google'

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
})

export function ResedentialHero() {
  return (
    <Hero
      subtitle="Resedential Interior Design"
      subtitleNote="রুচিতে আভিজাত্য, ছোঁয়ায় ঐতিহ্য"
      subtitleNotePosition="after-subtitle"
      subtitleNoteClassName={`${notoSerifBengali.className} text-[#f2d487] font-medium tracking-wide`}
      title="Designed for Living"
      titleHighlight="Crafted for Comfort."
      description="We design refined residential interiors that balance beauty, function, and everyday living"
      buttonText="Explore Our Work"
      backgroundImage="/banner/Banner10.png"
    />
  )
}
