import { Noto_Serif_Bengali } from 'next/font/google'

export const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-serif-bengali',
  display: 'swap',
})
