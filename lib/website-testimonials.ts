import prisma from '@/lib/prisma'

export type WebsiteTestimonial = {
  id: string
  quote: string
  author: string
  project: string
  image: string
  isPublished: boolean
  sortOrder: number
}

export const defaultWebsiteTestimonials: WebsiteTestimonial[] = [
  { id: 'seed-testimonial-1', quote: 'তাদের কাজ খুব ভালো লেগেছে। সব কিছু সময়মতো শেষ করেছে।', author: 'Siam Hossain', project: 'Residential Project', image: '/client agreement/Client-agreement1.jpg', isPublished: true, sortOrder: 1 },
  { id: 'seed-testimonial-2', quote: 'আমাদের বাসা এখন অনেক সুন্দর আর গুছানো লাগছে।', author: 'Nafiz Islam', project: 'Appartment Project', image: '/client agreement/Client-agreement2.jpg', isPublished: true, sortOrder: 2 },
  { id: 'seed-testimonial-3', quote: 'ডিজাইন আর কাজ দুটোই দারুণ হয়েছে।', author: 'Raihan Kabir', project: 'Commercial Project', image: '/client agreement/Client-agreement3.jpg', isPublished: true, sortOrder: 3 },
  { id: 'seed-testimonial-4', quote: 'তারা আমাদের জায়গাটাকে খুব সুন্দরভাবে সাজিয়ে দিয়েছে।', author: 'Tanvir Hasan', project: 'Residential Project', image: '/client agreement/Client-agreement4.jpg', isPublished: true, sortOrder: 4 },
  { id: 'seed-testimonial-5', quote: 'শুরু থেকে শেষ পর্যন্ত কাজের অভিজ্ঞতা খুব ভালো ছিল।', author: 'Shakib Anwar', project: 'Residential Project', image: '/client agreement/Client-agreement5.jpg', isPublished: true, sortOrder: 5 },
  { id: 'seed-testimonial-6', quote: 'ডিজাইনটা আমাদের পছন্দমতো হয়েছে, ব্যবহারেও অনেক সুবিধা।', author: 'Mahin Chowdhury', project: 'Appartment Project', image: '/client agreement/Client-agreement12.jpg', isPublished: true, sortOrder: 6 },
  { id: 'seed-testimonial-7', quote: 'ছোট ছোট বিষয়েও তারা খুব যত্ন নিয়েছে।', author: 'Sabbir Rahman', project: 'Architectural Design', image: '/client agreement/Client-agreement7.jpg', isPublished: true, sortOrder: 7 },
  { id: 'seed-testimonial-8', quote: 'যেমনটা চেয়েছিলাম, ঠিক তেমনটাই পেয়েছি।', author: 'Ishraq Mahmud', project: 'Residential Project', image: '/client agreement/Client-agreement15.jpg', isPublished: true, sortOrder: 8 },
  { id: 'seed-testimonial-9', quote: 'স্পেস প্ল্যানিংটা খুব সুন্দর হয়েছে, সবকিছু মানানসই।', author: 'Arafat Karim', project: 'Appartment Project', image: '/client agreement/Client-agreement9.jpg', isPublished: true, sortOrder: 9 },
  { id: 'seed-testimonial-10', quote: 'প্রতিটি ধাপে তারা আমাদের ভালোভাবে গাইড করেছে।', author: 'Mehedi Hasan', project: 'Commercial Project', image: '/client agreement/Client-agreement10.jpg', isPublished: true, sortOrder: 10 },
  { id: 'seed-testimonial-11', quote: 'ফাইনাল কাজটা খুব পরিষ্কার আর ব্যবহারযোগ্য হয়েছে।', author: 'Rakib Uddin', project: 'Residential Project', image: '/client agreement/Client-agreement11.jpg', isPublished: true, sortOrder: 11 },
  { id: 'seed-testimonial-12', quote: 'আইডিয়া, যোগাযোগ আর ফিনিশিং সবকিছুই চমৎকার ছিল।', author: 'Fahim Reza', project: '3D Design', image: '/client agreement/Client-agreement12.jpg', isPublished: true, sortOrder: 12 },
  { id: 'seed-testimonial-13', quote: 'আলোচনার মতোই কাজ হয়েছে, আমরা খুব সন্তুষ্ট।', author: 'Shafin Ahmed', project: 'Appartment Project', image: '/client agreement/Client-agreement11.jpg', isPublished: true, sortOrder: 13 },
]

export async function ensureDefaultWebsiteTestimonials() {
  const [{ count }] = await prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::BIGINT AS count FROM "WebsiteTestimonial"`
  if (Number(count) > 0) return

  for (const testimonial of defaultWebsiteTestimonials) {
    await prisma.$executeRaw`
      INSERT INTO "WebsiteTestimonial" ("id", "quote", "author", "project", "image", "isPublished", "sortOrder", "updatedAt")
      VALUES (${testimonial.id}, ${testimonial.quote}, ${testimonial.author}, ${testimonial.project}, ${testimonial.image}, ${testimonial.isPublished}, ${testimonial.sortOrder}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `
  }
}

export async function getWebsiteTestimonials({ includeDrafts = false, seedDefaults = false } = {}) {
  try {
    if (seedDefaults) await ensureDefaultWebsiteTestimonials()

    return await prisma.$queryRaw<WebsiteTestimonial[]>`
      SELECT "id", "quote", "author", "project", "image", "isPublished", "sortOrder"
      FROM "WebsiteTestimonial"
      WHERE (${includeDrafts}::BOOLEAN = true OR "isPublished" = true)
      ORDER BY "sortOrder" ASC, "createdAt" DESC
    `
  } catch {
    return []
  }
}
