'use client'

import { Hero } from '@/components/common/commonHero'
import { Noto_Serif_Bengali } from 'next/font/google'

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600'],
})

export function HowWeWorkHero() {
  return (
    <Hero
      subtitle="Our Process"
      title="A Smooth Journey"
      titleHighlight="From Idea to Installation"
      subtitleNote="আপনার স্বপ্নকে একটি নিখুঁত ও নান্দনিক রূপে রূপান্তর করতে আমরা প্রতিটি ধাপে কাজ করি সর্বোচ্চ যত্ন এবং সূক্ষ্মতার সাথে।"
      subtitleNoteClassName={`${notoSerifBengali.className} text-white`}
      description="Discover how we transform your vision into a beautifully crafted space, step by step with precision and care."
      buttonText="View All Projects"
      backgroundImage="/banner/Banner5.png"
      backgroundImageClassName="object-bottom"
    />
  )
}
