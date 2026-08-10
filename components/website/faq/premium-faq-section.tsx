import { ArrowUpRight, CheckCircle2 } from "lucide-react"

export type FaqItem = {
  question: string
  answer: string
}

type PremiumFaqSectionProps = {
  eyebrow?: string
  title?: string
  description?: string
  items: FaqItem[]
}

export function PremiumFaqSection({
  eyebrow = "SEO FAQ",
  title = "Interior Design Questions Clients Ask First",
  description = "Clear answers about interior design cost, pricing, company selection, and project planning in Dhaka and Bangladesh.",
  items,
}: PremiumFaqSectionProps) {
  return (
    <section className="relative overflow-hidden bg-[#f7f2e8] py-20 lg:py-28">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#d8b251]/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#0d3d3d]/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#a57c00]">{eyebrow}</p>
          <h2 className="mt-4 font-serif text-4xl font-light leading-tight text-[#0d3d3d] md:text-5xl">
            {title}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-8 text-black/65">{description}</p>

          <div className="mt-8 rounded-3xl border border-[#0d3d3d]/10 bg-white/70 p-6 shadow-[0_24px_80px_rgba(13,61,61,0.10)] backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0d3d3d] text-white">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-[#0d3d3d]">Trusted local design guidance</h3>
                <p className="mt-2 text-sm leading-6 text-black/60">
                  Aesthetic Interior Studio serves Dhaka and Bangladesh with modern contemporary interior design for
                  homes, offices, retail, and architectural spaces.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <details
              key={item.question}
              className="group rounded-3xl border border-[#0d3d3d]/10 bg-white/85 p-6 shadow-[0_18px_60px_rgba(13,61,61,0.08)] backdrop-blur transition hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(13,61,61,0.14)]"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6">
                <h3 className="font-serif text-xl text-[#0d3d3d] md:text-2xl">{item.question}</h3>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f7f2e8] text-[#a57c00] transition group-open:rotate-45 group-open:bg-[#a57c00] group-open:text-white">
                  <ArrowUpRight className="h-5 w-5" />
                </span>
              </summary>
              <p className="mt-5 border-t border-[#0d3d3d]/10 pt-5 text-sm leading-7 text-black/65 md:text-base">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
