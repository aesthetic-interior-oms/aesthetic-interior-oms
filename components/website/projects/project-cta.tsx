import Link from "next/link"
import { Button } from "@/components/ui/button"

export function ProjectCTA() {
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="bg-[#f5f0e8] rounded-2xl p-8 md:p-12 lg:p-16 text-center">
          <p className="text-[#a57c00] text-sm uppercase tracking-widest mb-3 font-medium">Start Your Journey</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0d3d3d] text-balance max-w-2xl mx-auto">
            Ready to transform your space?
          </h2>
          <p className="mt-4 text-[#0d3d3d]/70 max-w-lg mx-auto leading-relaxed">
            Send us a video and description of your current setup. Let's discuss your dream space and how we can bring
            it to life.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild className="bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-8 py-6 text-base">
              <Link href="/contact">Book Consultation</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-[#0d3d3d] text-[#0d3d3d] hover:bg-[#0d3d3d] hover:text-white rounded-full px-8 py-6 text-base bg-transparent"
            >
              <Link href="tel:+15551234567">Call Us Now</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
