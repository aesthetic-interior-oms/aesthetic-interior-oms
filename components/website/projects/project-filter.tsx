"use client"

import { cn } from "@/lib/utils"

const categories = [
  { id: "all", label: "All Projects" },
  { id: "residential", label: "Residential" },
  { id: "commercial", label: "Commercial" },
  { id: "renovation", label: "Renovation" },
  { id: "furniture", label: "Furniture" },
]

interface ProjectFilterProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
}

export function ProjectFilter({ activeFilter, onFilterChange }: ProjectFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-3 md:gap-4">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onFilterChange(category.id)}
          className={`px-4 py-2 rounded-full text-sm transition-colors ${activeFilter === category.id
              ? "bg-[#0d3d3d] text-white"
              : "bg-gray-200 text-gray-700 hover:bg-[#0d3d3d] hover:text-white"
            }`}
        >
          {category.label}
        </button>
      ))}
    </div>
  )
}
