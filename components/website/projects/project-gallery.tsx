"use client"

import { useState } from "react"
import { ProjectFilter } from "./project-filter"
import { ProjectCard } from "./project-card"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { websiteProjects } from "@/lib/website-projects"

const INITIAL_DISPLAY_COUNT = 6

export function ProjectGallery() {
  const [activeFilter, setActiveFilter] = useState("all")
  const [showAll, setShowAll] = useState(false)

  const filteredProjects =
    activeFilter === "all" ? websiteProjects : websiteProjects.filter((project) => project.category === activeFilter)

  const displayedProjects = showAll ? filteredProjects : filteredProjects.slice(0, INITIAL_DISPLAY_COUNT)
  const hasMoreProjects = filteredProjects.length > INITIAL_DISPLAY_COUNT

  return (
    <section className="py-16 md:py-24 bg-[#faf9f6] border-t border-gray-200">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-[#a57c00] text-sm uppercase tracking-widest mb-3 font-medium">Portfolio</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-[#0d3d3d] text-balance">
            Explore Our Work
          </h2>
          <p className="text-[#0d3d3d]/70 mt-4 max-w-2xl mx-auto leading-relaxed">
            Discover our collection of {websiteProjects.length}+ completed projects across Bangladesh, showcasing our
            expertise in residential, renovation, and custom furniture design.
          </p>
        </div>

        <div className="mb-12">
          <ProjectFilter
            activeFilter={activeFilter}
            onFilterChange={(filter) => {
              setActiveFilter(filter)
              setShowAll(false)
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

        {hasMoreProjects && (
          <div className="flex justify-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowAll(!showAll)}
              className="border-[#0d3d3d] text-[#0d3d3d] hover:bg-[#0d3d3d] hover:text-white transition-all duration-300 px-8 py-6"
            >
              {showAll ? (
                <>
                  View Less <ChevronUp className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  View More ({filteredProjects.length - INITIAL_DISPLAY_COUNT} more){" "}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        <div className="text-center mt-8">
          <p className="text-[#0d3d3d]/50 text-sm">
            Showing {displayedProjects.length} of {filteredProjects.length} projects
          </p>
        </div>
      </div>
    </section>
  )
}
