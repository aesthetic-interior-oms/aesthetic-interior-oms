import { list, put } from '@vercel/blob'

export type WebsiteTestimonial = {
  id: string
  quote: string
  author: string
  project: string
  image: string
  isPublished: boolean
  sortOrder: number
}

const TESTIMONIALS_BLOB_PATH = 'website-testimonials/data.json'

export const defaultWebsiteTestimonials: WebsiteTestimonial[] = [
  { id: 'siam-hossain', quote: 'তাদের কাজ খুব ভালো লেগেছে। সব কিছু সময়মতো শেষ করেছে।', author: 'Siam Hossain', project: 'Residential Project', image: '/client agreement/Client-agreement1.jpg', isPublished: true, sortOrder: 0 },
  { id: 'nafiz-islam', quote: 'আমাদের বাসা এখন অনেক সুন্দর আর গুছানো লাগছে।', author: 'Nafiz Islam', project: 'Appartment Project', image: '/client agreement/Client-agreement2.jpg', isPublished: true, sortOrder: 1 },
  { id: 'raihan-kabir', quote: 'ডিজাইন আর কাজ দুটোই দারুণ হয়েছে।', author: 'Raihan Kabir', project: 'Commercial Project', image: '/client agreement/Client-agreement3.jpg', isPublished: true, sortOrder: 2 },
  { id: 'tanvir-hasan', quote: 'তারা আমাদের জায়গাটাকে খুব সুন্দরভাবে সাজিয়ে দিয়েছে।', author: 'Tanvir Hasan', project: 'Residential Project', image: '/client agreement/Client-agreement4.jpg', isPublished: true, sortOrder: 3 },
  { id: 'shakib-anwar', quote: 'শুরু থেকে শেষ পর্যন্ত কাজের অভিজ্ঞতা খুব ভালো ছিল।', author: 'Shakib Anwar', project: 'Residential Project', image: '/client agreement/Client-agreement5.jpg', isPublished: true, sortOrder: 4 },
  { id: 'mahin-chowdhury', quote: 'ডিজাইনটা আমাদের পছন্দমতো হয়েছে, ব্যবহারেও অনেক সুবিধা।', author: 'Mahin Chowdhury', project: 'Appartment Project', image: '/client agreement/Client-agreement12.jpg', isPublished: true, sortOrder: 5 },
  { id: 'sabbir-rahman', quote: 'ছোট ছোট বিষয়েও তারা খুব যত্ন নিয়েছে।', author: 'Sabbir Rahman', project: 'Architectural Design', image: '/client agreement/Client-agreement7.jpg', isPublished: true, sortOrder: 6 },
  { id: 'ishraq-mahmud', quote: 'যেমনটা চেয়েছিলাম, ঠিক তেমনটাই পেয়েছি।', author: 'Ishraq Mahmud', project: 'Residential Project', image: '/client agreement/Client-agreement15.jpg', isPublished: true, sortOrder: 7 },
  { id: 'arafat-karim', quote: 'স্পেস প্ল্যানিংটা খুব সুন্দর হয়েছে, সবকিছু মানানসই।', author: 'Arafat Karim', project: 'Appartment Project', image: '/client agreement/Client-agreement9.jpg', isPublished: true, sortOrder: 8 },
  { id: 'mehedi-hasan', quote: 'প্রতিটি ধাপে তারা আমাদের ভালোভাবে গাইড করেছে।', author: 'Mehedi Hasan', project: 'Commercial Project', image: '/client agreement/Client-agreement10.jpg', isPublished: true, sortOrder: 9 },
  { id: 'rakib-uddin', quote: 'ফাইনাল কাজটা খুব পরিষ্কার আর ব্যবহারযোগ্য হয়েছে।', author: 'Rakib Uddin', project: 'Residential Project', image: '/client agreement/Client-agreement11.jpg', isPublished: true, sortOrder: 10 },
  { id: 'fahim-reza', quote: 'আইডিয়া, যোগাযোগ আর ফিনিশিং সবকিছুই চমৎকার ছিল।', author: 'Fahim Reza', project: '3D Design', image: '/client agreement/Client-agreement12.jpg', isPublished: true, sortOrder: 11 },
  { id: 'shafin-ahmed', quote: 'আলোচনার মতোই কাজ হয়েছে, আমরা খুব সন্তুষ্ট।', author: 'Shafin Ahmed', project: 'Appartment Project', image: '/client agreement/Client-agreement11.jpg', isPublished: true, sortOrder: 12 },
]

function sortTestimonials(items: WebsiteTestimonial[]) {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.author.localeCompare(b.author))
}

function normalizeTestimonial(item: Partial<WebsiteTestimonial>, index: number): WebsiteTestimonial | null {
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `testimonial-${index}`
  const quote = typeof item.quote === 'string' ? item.quote.trim() : ''
  const author = typeof item.author === 'string' ? item.author.trim() : ''
  const project = typeof item.project === 'string' ? item.project.trim() : ''
  const image = typeof item.image === 'string' ? item.image.trim() : ''
  if (!quote || !author || !project || !image) return null
  return { id, quote, author, project, image, isPublished: item.isPublished !== false, sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : index }
}

export async function getWebsiteTestimonials({ includeDrafts = false } = {}) {
  let testimonials = defaultWebsiteTestimonials
  try {
    const result = await list({ prefix: TESTIMONIALS_BLOB_PATH, limit: 1 })
    const blob = result.blobs.find((item) => item.pathname === TESTIMONIALS_BLOB_PATH)
    if (blob?.url) {
      const response = await fetch(blob.url, { cache: 'no-store' })
      if (response.ok) {
        const payload = (await response.json()) as unknown
        if (Array.isArray(payload)) {
          const normalized = payload.map((item, index) => normalizeTestimonial(item as Partial<WebsiteTestimonial>, index)).filter((item): item is WebsiteTestimonial => Boolean(item))
          if (normalized.length > 0) testimonials = normalized
        }
      }
    }
  } catch (error) {
    console.error('[website-testimonials] Falling back to seeded testimonials:', error)
  }
  return sortTestimonials(includeDrafts ? testimonials : testimonials.filter((item) => item.isPublished))
}

export async function saveWebsiteTestimonials(testimonials: WebsiteTestimonial[]) {
  const normalized = testimonials.map((item, index) => normalizeTestimonial(item, index)).filter((item): item is WebsiteTestimonial => Boolean(item))
  await put(TESTIMONIALS_BLOB_PATH, JSON.stringify(sortTestimonials(normalized), null, 2), {
    access: 'public',
    contentType: 'application/json',
    allowOverwrite: true,
  })
  return getWebsiteTestimonials({ includeDrafts: true })
}
