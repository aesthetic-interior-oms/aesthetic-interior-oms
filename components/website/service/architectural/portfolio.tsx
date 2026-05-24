'use client'

import { Portfolio } from '@/components/website/service/portfolio/portfolio'

const projects = [
    {
		id: 1,
		title: "Executive Lounge & Reception",
		category: "Corporate",
		location: "Mumbai, India",
		year: "2024",
		area: "1,200 sq ft",
		image: "/architect/archImgae1.jpg",
		description:
			"A sophisticated client-facing space designed to reflect brand prestige and ensure lasting first impressions.",
	},
	{
		id: 2,
		title: "Commercial Pantry & Breakroom",
		category: "Office",
		location: "Delhi, India",
		year: "2024",
		area: "380 sq ft",
		image: "/architect/arcImage10.png",
		description:
			"A modern, efficient breakroom designed to boost employee morale and encourage collaboration.",
	},
	{
		id: 3,
		title: "Boutique Hotel Suite",
		category: "Hospitality",
		location: "Bangalore, India",
		year: "2023",
		area: "650 sq ft",
		image: "/architect/archImgae3.jpg",
		description:
			"Luxury hospitality design that balances guest comfort with operational efficiency.",
	},
	{
		id: 4,
		title: "Private Office Cabin",
		category: "Corporate",
		location: "Pune, India",
		year: "2024",
		area: "280 sq ft",
		image: "/architect/archImgae4.jpg",
		description:
			"Minimalist executive workspace optimized for focus, privacy, and professional meetings.",
	},
	{
		id: 5,
		title: "Conference & Meeting Room",
		category: "Corporate",
		location: "Chennai, India",
		year: "2024",
		area: "520 sq ft",
		image: "/architect/archImgae5.png",
		description:
			"Tech-integrated meeting space designed for seamless presentations and client discussions.",
	},
	{
		id: 6,
		title: "Office Reception & Lobby",
		category: "Office",
		location: "Hyderabad, India",
		year: "2023",
		area: "320 sq ft",
		image: "/architect/archImgae6.jpg",
		description:
			"A welcoming entry point that establishes brand identity and guides visitor flow.",
	},
	{
		id: 7,
		title: "Cafe & Coffee Bar",
		category: "Retail",
		location: "Kolkata, India",
		year: "2024",
		area: "450 sq ft",
		image: "/architect/archImgae7.webp",
		description:
			"A vibrant retail space designed to maximize customer engagement and operational workflow.",
	},
	{
		id: 8,
		title: "Luxury Wellness Suite",
		category: "Hospitality",
		location: "Ahmedabad, India",
		year: "2024",
		area: "800 sq ft",
		image: "/architect/archImgae8.webp",
		description:
			"Premium spa and wellness environment crafted for relaxation and guest experience.",
	},
	{
		id: 9,
		title: "Co-Working Collaboration Zone",
		category: "Office",
		location: "Jaipur, India",
		year: "2023",
		area: "1,500 sq ft",
		image: "/architect/archImgae9.jpg",
		description:
			"An agile workspace designed to foster creativity, networking, and flexible work styles.",
	},
  // ... your architectural projects
]

export function ArchitecturalPortfolio() {
  return (
    <Portfolio
      projects={projects}
      portfolioTitle="Architectural Interior"
      portfolioSubtitle="Design"
      portfolioDescription="Explore our collection of meticulously crafted architectural interiors..."
    />
  )
}
