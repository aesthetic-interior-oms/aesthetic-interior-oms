import { getWebsiteTestimonials } from "@/lib/website-testimonials"
import { TestimonialsCarousel } from "./testimonials-carousel"

export async function TestimonialsSection() {
  const testimonials = await getWebsiteTestimonials()

  return (
    <section className="py-20 lg:py-32 bg-card border-t border-border overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-12 text-center">
        <span className="text-sm uppercase tracking-widest text-[#a57c00]">Testimonials</span>
        <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl text-[#0d3d3d]">
          What our clients say
        </h2>
      </div>

      <TestimonialsCarousel testimonials={testimonials} />
    </section>
  )
}
