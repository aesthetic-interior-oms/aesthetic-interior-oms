'use client'

import { Hero } from '@/components/common/commonHero'
import { Noto_Serif_Bengali } from 'next/font/google'

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
})

export function AboutHero() {
  return (
    <Hero
      subtitle="About Us"
      subtitleNote="যাঁদের হাত ধরে প্রতিটি সাধারণ স্পেস হয়ে ওঠে একেকটি নান্দনিক শিল্প।"
      subtitleNoteClassName={`${notoSerifBengali.className} text-white`}
      title="Built on Vision"
      titleHighlight="Designed with Passion"
      description="We are a design-focused interior studio dedicated to creating functional and inspiring spaces that reflect each client's vision and lifestyle."
      buttonText="Learn More"
      backgroundImage="/banner/Banner12.png"
    />
  )
}
