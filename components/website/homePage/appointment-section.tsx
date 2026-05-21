"use client"

import { Button } from "@/components/ui/button"
import {useRouter} from 'next/navigation'

export function AppointmentSection() {
 const router = useRouter()

  return (
    <section className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative bg-[#0d3d3d] text-white p-10 md:p-16 lg:p-20 rounded-2xl overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#a57c00]/10 rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#a57c00]/10 rounded-full -translate-x-1/2 translate-y-1/2" />

          <div className="max-w-2xl relative z-10">
            <span className="text-sm uppercase tracking-widest text-[#a57c00]">Book Your Appointment</span>
            <h2 className="mt-4 font-serif text-3xl md:text-4xl lg:text-5xl leading-tight text-balance">
              Let's design your space.
            </h2>
            <p className="mt-6 text-white/80 leading-relaxed">
              Whether you're planning a new home, a renovation, or a commercial space, we're here to help.
            </p>
            <Button
            onClick={()=> router.push('/contact')} 
            className="mt-8 bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-8 py-6 text-sm">
              Book a Consultation
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
