"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ProjectFilter } from "../projects/project-filter"
import { ProjectCard } from "../projects/project-card"
import type { WebsiteProject } from "@/lib/website-projects"

const INITIAL_DISPLAY_COUNT = 6

export function ProjectSection({ projects }: { projects: WebsiteProject[] }) {
  const [activeFilter, setActiveFilter] = useState("all")

  const filteredProjects =
    activeFilter === "all" ? projects : projects.filter((project) => project.category === activeFilter)

  const displayedProjects = filteredProjects.slice(0, INITIAL_DISPLAY_COUNT)

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#a57c00] text-sm uppercase tracking-widest mb-3 font-medium">Portfolio</p>
          <h2 className="text-3xl md:text-4xl font-serif text-[#0d3d3d] text-balance">Explore Our Work</h2>
          <p className="text-[#0d3d3d]/70 mt-4 max-w-2xl mx-auto">
            Discover our collection of {projects.length}+ completed projects across Bangladesh, showcasing our
            expertise in residential, renovation, and custom furniture design.
          </p>
        </div>

        <div className="mb-12">
          <ProjectFilter
            activeFilter={activeFilter}
            onFilterChange={(filter) => {
              setActiveFilter(filter)
            }}
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayedProjects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-16">
            <p className="text-[#0d3d3d]/60">No projects found in this category.</p>
          </div>
        )}

        <div className="flex justify-center mt-12">
          <Link href="/projects">
            <Button
              variant="outline"
              className="rounded-full px-8 py-6 text-sm border-black text-[#0d3d3d] hover:bg-[#0d3d3d] hover:text-[#ffffff]"
            >
              Explore More
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
