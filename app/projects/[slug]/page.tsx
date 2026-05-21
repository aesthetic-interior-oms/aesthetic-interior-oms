import Image from "next/image"
import { notFound } from "next/navigation"
import { getProjectBySlug } from "@/lib/website-projects"

type Props = {
  params: Promise<{ slug: string }>
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { slug } = await params
  const project = getProjectBySlug(slug)

  if (!project) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-white pt-20">
      <section className="relative h-[45vh] md:h-[60vh] overflow-hidden">
        <Image
          src={project.bannerImage}
          alt={`${project.title} banner image`}
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-end">
          <div className="mx-auto w-full max-w-7xl px-6 lg:px-8 pb-10 md:pb-14 text-white">
            <p className="text-[#d8b251] uppercase tracking-widest text-xs mb-2">Project Details</p>
            <h1 className="text-3xl md:text-5xl font-serif">{project.title}</h1>
            <p className="mt-2 text-white/85">Owner: {project.ownerName}</p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">Project Type</p><p className="font-medium">{project.type}</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">Area</p><p className="font-medium">{project.sqft} sqft</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">Duration</p><p className="font-medium">{project.duration}</p></div>
            <div className="rounded-lg border p-4"><p className="text-sm text-gray-500">Location</p><p className="font-medium">{project.location}</p></div>
          </div>

          <p className="text-[#0d3d3d]/80 mb-8 max-w-3xl">{project.description}</p>

          <div className="grid md:grid-cols-2 gap-6">
            {project.images.map((image, index) => (
              <div key={image} className="overflow-hidden rounded-xl border">
                <Image
                  src={image}
                  alt={`${project.title} image ${index + 1}`}
                  width={1400}
                  height={1000}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
