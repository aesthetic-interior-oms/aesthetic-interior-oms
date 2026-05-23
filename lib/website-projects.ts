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
  {
    id: 3,
    slug: "gangchil",
    title: "Gangchil (গাঙ্গচিল)",
    ownerName: "Justice Tariqul Hakim",
    type: "Duplex",
    sqft: "2760",
    duration: "4 months",
    category: "residential",
    location: "Gazipur, Dhaka, Bangladesh",
    bannerImage: "/Projects/Project3/01.jpg",
    images: [
      "/Projects/Project3/01.jpg",
      "/Projects/Project3/04.jpg",
      "/Projects/Project3/06.jpg",
      "/Projects/Project3/11.jpg",
      "/Projects/Project3/kitchen view 01 (3).jpg",
    ],
    description:
      "Gangchil is a spacious duplex interior featuring thoughtful design elements and premium finishes that create a sophisticated living environment.",
  },
  {
    id: 4,
    slug: "ovijan",
    title: "Ovijan (ওভিজান)",
    ownerName: "Shekh Mohammad Iqbal",
    type: "Duplex",
    sqft: "2310",
    duration: "2 months",
    category: "residential",
    location: "Tongi, Dhaka, Bangladesh",
    bannerImage: "/Projects/Project4/Child Bed Female 01.jpg",
    images: [
      "/Projects/Project4/Child Bed Female 01.jpg",
      "/Projects/Project4/Child Bath Female 01.jpg",
    ],
    description:
      "Ovijan is a modern duplex project that combines contemporary design with functional living spaces, optimized for comfort and aesthetics.",
  },
  {
    id: 5,
    slug: "aguntak",
    title: "Aguntak (আগুনতক)",
    ownerName: "Mrs Rumana Sonia",
    type: "Apartment",
    sqft: "2220",
    duration: "4 months",
    category: "residential",
    location: "Sylhet, Bangladesh",
    bannerImage: "/Projects/Project5/Living room_cam_01.jpg",
    images: [
      "/Projects/Project5/Living room_cam_01.jpg",
      "/Projects/Project5/F living_cam_02.jpg",
      "/Projects/Project5/Dining_cam_03..jpg",
      "/Projects/Project5/Kitchen_cam_01 - Copy.jpg",
      "/Projects/Project5/CHILD ROOM_CAM_02.jpg",
      "/Projects/Project5/Entry_cam_01.jpg",
      "/Projects/Project5/M Toilet_cam_01.jpg",
    ],
    description:
      "Aguntak is a beautifully designed apartment that showcases modern living spaces with warm aesthetics and premium interior finishes.",
  },
]

export function getProjectBySlug(slug: string) {
  return websiteProjects.find((project) => project.slug === slug)
}
