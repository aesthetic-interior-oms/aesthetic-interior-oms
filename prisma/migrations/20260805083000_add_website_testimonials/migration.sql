CREATE TABLE "WebsiteTestimonial" (
  "id" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "project" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebsiteTestimonial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteTestimonial_isPublished_sortOrder_idx" ON "WebsiteTestimonial"("isPublished", "sortOrder");

INSERT INTO "WebsiteVideo" ("id", "title", "url", "provider", "videoId", "embedUrl", "thumbnailUrl", "duration", "isFeatured", "isPublished", "sortOrder", "updatedAt")
VALUES
  ('seed-video-featured', 'Featured Design Story', 'https://www.youtube.com/watch?v=D-Py5LNmAJA', 'youtube', 'D-Py5LNmAJA', 'https://www.youtube-nocookie.com/embed/D-Py5LNmAJA', 'https://img.youtube.com/vi/D-Py5LNmAJA/maxresdefault.jpg', NULL, true, true, 0, CURRENT_TIMESTAMP),
  ('seed-video-1', 'Interior Design Tour', 'https://www.youtube.com/watch?v=kxzxIEPv7QY', 'youtube', 'kxzxIEPv7QY', 'https://www.youtube-nocookie.com/embed/kxzxIEPv7QY', 'https://img.youtube.com/vi/kxzxIEPv7QY/maxresdefault.jpg', '3:45', false, true, 1, CURRENT_TIMESTAMP),
  ('seed-video-2', 'Client Project Walkthrough', 'https://www.youtube.com/watch?v=bFnOafhlsm8', 'youtube', 'bFnOafhlsm8', 'https://www.youtube-nocookie.com/embed/bFnOafhlsm8', 'https://img.youtube.com/vi/bFnOafhlsm8/maxresdefault.jpg', '5:20', false, true, 2, CURRENT_TIMESTAMP),
  ('seed-video-3', 'Living Room Design Ideas', 'https://www.youtube.com/watch?v=m23oIOdAkQE', 'youtube', 'm23oIOdAkQE', 'https://www.youtube-nocookie.com/embed/m23oIOdAkQE', 'https://img.youtube.com/vi/m23oIOdAkQE/maxresdefault.jpg', '4:15', false, true, 3, CURRENT_TIMESTAMP),
  ('seed-video-4', 'Kitchen Renovation Project', 'https://www.youtube.com/watch?v=FZn7HVQtl5c', 'youtube', 'FZn7HVQtl5c', 'https://www.youtube-nocookie.com/embed/FZn7HVQtl5c', 'https://img.youtube.com/vi/FZn7HVQtl5c/maxresdefault.jpg', '6:30', false, true, 4, CURRENT_TIMESTAMP),
  ('seed-video-5', 'Bedroom Makeover', 'https://www.youtube.com/watch?v=DODn4TqAHaE', 'youtube', 'DODn4TqAHaE', 'https://www.youtube-nocookie.com/embed/DODn4TqAHaE', 'https://img.youtube.com/vi/DODn4TqAHaE/maxresdefault.jpg', '3:10', false, true, 5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "WebsiteTestimonial" ("id", "quote", "author", "project", "image", "isPublished", "sortOrder", "updatedAt")
VALUES
  ('seed-testimonial-1', 'তাদের কাজ খুব ভালো লেগেছে। সব কিছু সময়মতো শেষ করেছে।', 'Siam Hossain', 'Residential Project', '/client agreement/Client-agreement1.jpg', true, 1, CURRENT_TIMESTAMP),
  ('seed-testimonial-2', 'আমাদের বাসা এখন অনেক সুন্দর আর গুছানো লাগছে।', 'Nafiz Islam', 'Appartment Project', '/client agreement/Client-agreement2.jpg', true, 2, CURRENT_TIMESTAMP),
  ('seed-testimonial-3', 'ডিজাইন আর কাজ দুটোই দারুণ হয়েছে।', 'Raihan Kabir', 'Commercial Project', '/client agreement/Client-agreement3.jpg', true, 3, CURRENT_TIMESTAMP),
  ('seed-testimonial-4', 'তারা আমাদের জায়গাটাকে খুব সুন্দরভাবে সাজিয়ে দিয়েছে।', 'Tanvir Hasan', 'Residential Project', '/client agreement/Client-agreement4.jpg', true, 4, CURRENT_TIMESTAMP),
  ('seed-testimonial-5', 'শুরু থেকে শেষ পর্যন্ত কাজের অভিজ্ঞতা খুব ভালো ছিল।', 'Shakib Anwar', 'Residential Project', '/client agreement/Client-agreement5.jpg', true, 5, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "WebsiteVideo" ("id", "title", "url", "provider", "videoId", "embedUrl", "thumbnailUrl", "duration", "isFeatured", "isPublished", "sortOrder", "updatedAt")
VALUES
  ('seed-video-6', 'Office Space Design', 'https://www.youtube.com/watch?v=EY2WkvPZdtk', 'youtube', 'EY2WkvPZdtk', 'https://www.youtube-nocookie.com/embed/EY2WkvPZdtk', 'https://img.youtube.com/vi/EY2WkvPZdtk/maxresdefault.jpg', '4:55', false, true, 6, CURRENT_TIMESTAMP),
  ('seed-video-7', 'Bathroom Renovation', 'https://www.youtube.com/watch?v=SKYpjlBHkPM', 'youtube', 'SKYpjlBHkPM', 'https://www.youtube-nocookie.com/embed/SKYpjlBHkPM', 'https://img.youtube.com/vi/SKYpjlBHkPM/maxresdefault.jpg', '3:30', false, true, 7, CURRENT_TIMESTAMP),
  ('seed-video-8', 'Dining Room Transformation', 'https://www.youtube.com/watch?v=FZn7HVQtl5c', 'youtube', 'FZn7HVQtl5c', 'https://www.youtube-nocookie.com/embed/FZn7HVQtl5c', 'https://img.youtube.com/vi/FZn7HVQtl5c/maxresdefault.jpg', '4:00', false, true, 8, CURRENT_TIMESTAMP),
  ('seed-video-9', 'Balcony Garden Design', 'https://www.youtube.com/watch?v=kxzxIEPv7QY', 'youtube', 'kxzxIEPv7QY', 'https://www.youtube-nocookie.com/embed/kxzxIEPv7QY', 'https://img.youtube.com/vi/kxzxIEPv7QY/maxresdefault.jpg', '2:45', false, true, 9, CURRENT_TIMESTAMP),
  ('seed-video-10', 'Walk-in Closet Ideas', 'https://www.youtube.com/watch?v=EY2WkvPZdtk', 'youtube', 'EY2WkvPZdtk', 'https://www.youtube-nocookie.com/embed/EY2WkvPZdtk', 'https://img.youtube.com/vi/EY2WkvPZdtk/maxresdefault.jpg', '5:00', false, true, 10, CURRENT_TIMESTAMP),
  ('seed-video-11', 'Walk-in Closet Ideas', 'https://www.youtube.com/watch?v=kXDUVDV6zus', 'youtube', 'kXDUVDV6zus', 'https://www.youtube-nocookie.com/embed/kXDUVDV6zus', 'https://img.youtube.com/vi/kXDUVDV6zus/maxresdefault.jpg', '5:00', false, true, 11, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "WebsiteTestimonial" ("id", "quote", "author", "project", "image", "isPublished", "sortOrder", "updatedAt")
VALUES
  ('seed-testimonial-6', 'ডিজাইনটা আমাদের পছন্দমতো হয়েছে, ব্যবহারেও অনেক সুবিধা।', 'Mahin Chowdhury', 'Appartment Project', '/client agreement/Client-agreement12.jpg', true, 6, CURRENT_TIMESTAMP),
  ('seed-testimonial-7', 'ছোট ছোট বিষয়েও তারা খুব যত্ন নিয়েছে।', 'Sabbir Rahman', 'Architectural Design', '/client agreement/Client-agreement7.jpg', true, 7, CURRENT_TIMESTAMP),
  ('seed-testimonial-8', 'যেমনটা চেয়েছিলাম, ঠিক তেমনটাই পেয়েছি।', 'Ishraq Mahmud', 'Residential Project', '/client agreement/Client-agreement15.jpg', true, 8, CURRENT_TIMESTAMP),
  ('seed-testimonial-9', 'স্পেস প্ল্যানিংটা খুব সুন্দর হয়েছে, সবকিছু মানানসই।', 'Arafat Karim', 'Appartment Project', '/client agreement/Client-agreement9.jpg', true, 9, CURRENT_TIMESTAMP),
  ('seed-testimonial-10', 'প্রতিটি ধাপে তারা আমাদের ভালোভাবে গাইড করেছে।', 'Mehedi Hasan', 'Commercial Project', '/client agreement/Client-agreement10.jpg', true, 10, CURRENT_TIMESTAMP),
  ('seed-testimonial-11', 'ফাইনাল কাজটা খুব পরিষ্কার আর ব্যবহারযোগ্য হয়েছে।', 'Rakib Uddin', 'Residential Project', '/client agreement/Client-agreement11.jpg', true, 11, CURRENT_TIMESTAMP),
  ('seed-testimonial-12', 'আইডিয়া, যোগাযোগ আর ফিনিশিং সবকিছুই চমৎকার ছিল।', 'Fahim Reza', '3D Design', '/client agreement/Client-agreement12.jpg', true, 12, CURRENT_TIMESTAMP),
  ('seed-testimonial-13', 'আলোচনার মতোই কাজ হয়েছে, আমরা খুব সন্তুষ্ট।', 'Shafin Ahmed', 'Appartment Project', '/client agreement/Client-agreement11.jpg', true, 13, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
