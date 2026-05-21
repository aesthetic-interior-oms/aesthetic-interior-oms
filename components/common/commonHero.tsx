import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

type HeroProps = {
  subtitle: string
  title: string
  titleHighlight?: string
  description: string
  buttonText?: string
  backgroundImage: string
  buttonHref?: string
}

export function Hero({
  subtitle,
  title,
  titleHighlight,
  description,
  buttonText,
  backgroundImage,
  buttonHref = "/projects",
}: HeroProps) {
  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center overflow-hidden">
      <Image
        src={backgroundImage || "/placeholder.svg"}
        alt={`${title} hero background`}
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#0d3d3d]/55" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 py-20 w-full">
        <div className="max-w-3xl text-white">
          <p className="text-sm uppercase tracking-[0.25em] text-[#d8b251] mb-4">{subtitle}</p>
          <h1 className="text-4xl md:text-6xl font-serif leading-tight">
            {title}
            {titleHighlight ? <span className="block text-[#d8b251]">{titleHighlight}</span> : null}
          </h1>
          <p className="mt-6 text-white/85 text-lg leading-relaxed">{description}</p>
          {buttonText ? (
            <div className="mt-8">
              <Button asChild className="bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-7 py-6 text-base">
                <Link href={buttonHref}>{buttonText}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
