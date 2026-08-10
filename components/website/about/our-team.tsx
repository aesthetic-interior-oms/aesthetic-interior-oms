import Image from 'next/image'
import { getWebsiteTeamMembers } from '@/lib/website-team'

export async function OurTeam() {
  const teamMembers = await getWebsiteTeamMembers()

  if (teamMembers.length === 0) return null

  return (
    <section className="py-24 bg-[#f5f4f0]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-[#a57c00] text-sm tracking-[0.2em] uppercase font-medium mb-4">
            Meet The Experts
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#1a3a2f] mb-6 text-balance">
            Our Team
          </h2>
          <p className="text-[#4a4a4a] max-w-2xl mx-auto leading-relaxed text-pretty">
            A passionate team of designers, architects, and project managers dedicated to bringing your vision to
            life.
          </p>
        </div>

        <div className="space-y-8 lg:space-y-10">
          {teamMembers.map((member, index) => {
            const isEven = index % 2 === 0

            return (
              <article key={member.id} className="rounded-2xl transition-all duration-500 p-5 sm:p-7 lg:p-8">
                <div
                  className={`flex flex-col gap-6 lg:gap-10 items-center ${
                    isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
                  }`}
                >
                  <div className="w-full lg:w-[28%]">
                    <div className="relative overflow-hidden rounded-2xl aspect-[3/4] bg-[#e9e6dd]">
                      <Image
                        src={member.image}
                        alt={`${member.name}, ${member.role} at Aesthetic Interior Studio`}
                        fill
                        sizes="(max-width: 1024px) 100vw, 38vw"
                        loading="lazy"
                        className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                      />
                    </div>
                  </div>

                  <div className={`w-full lg:w-[72%] ${isEven ? 'lg:text-left' : 'lg:text-right'} text-center`}>
                    <h3 className="text-2xl lg:text-3xl font-serif text-[#1a3a2f]">{member.name}</h3>
                    <p className="mt-2 text-sm text-[#a57c00] font-medium">
                      {member.role}{member.specialty ? ` in ${member.specialty}` : ''}
                    </p>
                    {member.quote && (
                      <p className="mt-5 text-[#4f4f4f] leading-relaxed text-base lg:text-lg">“{member.quote}”</p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
