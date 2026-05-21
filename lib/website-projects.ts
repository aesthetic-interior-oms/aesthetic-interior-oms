export type ProjectCategory = "residential" | "commercial" | "renovation" | "furniture"

export type WebsiteProject = {
  id: number
  slug: string
  title: string
  ownerName: string
  type: string
  sqft: string
  duration: string
  category: ProjectCategory
  location: string
  bannerImage: string
  images: string[]
  description: string
}

export const websiteProjects: WebsiteProject[] = [
  {
    id: 1,
    slug: "Chhayanaut",
    title: "ছায়ানট",
    ownerName: "Md Ahnab",
    type: "Duplex",
    sqft: "2000",
    duration: "2 months",
    category: "residential",
    location: "Dhaka, Bangladesh",
    bannerImage: "/Projects/Project1/Drawing Space_cam_01.jpg",
    images: [
      "/Projects/Project1/Drawing Space_cam_01.jpg",
      "/Projects/Project1/Drawing Space_cam_05.jpg",
      "/Projects/Project1/M bed 01_cam_05.jpg",
      "/Projects/Project1/M bed 01_cam_06.jpg",
      "/Projects/Project1/Upper corrdoor_cam_01.jpg",
    ],
    description:
      "Chhayanaut is a duplex home interior project focused on elegant, practical family living with warm tones and refined finishes.",
  },
  {
    id: 2,
    slug: "nirupama",
    title: "Nirupama (নিরুপমা)",
    ownerName: "Shahida Khanom",
    type: "Duplex",
    sqft: "2000",
    duration: "3 months",
    category: "residential",
    location: "Dhaka, Bangladesh",
    bannerImage: "/Projects/Project2/LIVING VIEW 03.jpg",
    images: [
      "/Projects/Project2/LIVING VIEW 03.jpg",
      "/Projects/Project2/DINING VIEW 01.jpg",
      "/Projects/Project2/g.bed view 02.jpg",
      "/Projects/Project2/c.bed toilet view 01.jpg",
      "/Projects/Project2/c.bed view 03.jpg",
      "/Projects/Project2/p.bed view 02.jpg",
      "/Projects/Project2/05.jpg",
    ],
    description:
      "Nirupama is a duplex interior project with a balanced modern layout, warm material palette, and comfortable family-focused spatial planning.",
  },
]

export function getProjectBySlug(slug: string) {
  return websiteProjects.find((project) => project.slug === slug)
}
