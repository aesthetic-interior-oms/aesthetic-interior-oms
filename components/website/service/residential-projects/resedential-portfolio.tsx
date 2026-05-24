'use client'

import { Portfolio } from '@/components/website/service/portfolio/portfolio'

const projects = [
	{
		id: 1,
		title: 'Contemporary Living Space',
		category: 'Living Room',
		location: 'Dhaka, Bangladesh',
		year: '2024',
		area: '450 sq ft',
		image: '/images/info1.jpg',
		description: 'A harmonious blend of modern aesthetics with comfortable living',
	},
	{
		id: 2,
		title: 'Luxury Entertainment Zone',
		category: 'Living Room',
		location: 'Delhi, India',
		year: '2024',
		area: '520 sq ft',
		image: '/images/info2.jpg',
		description: 'Premium entertainment space with state-of-the-art design',
	},
	{
		id: 3,
		title: 'Modern Textured Lounge',
		category: 'Living Room',
		location: 'Bangalore, India',
		year: '2023',
		area: '480 sq ft',
		image: '/images/info3.jpg',
		description: 'Rich textures meet contemporary comfort',
	},
	{
		id: 4,
		title: 'Elegant Crockery Display',
		category: 'Kitchen',
		location: 'Pune, India',
		year: '2024',
		area: '180 sq ft',
		image: '/images/info6.jpg',
		description: 'Sophisticated storage meets artistic presentation',
	},
	{
		id: 5,
		title: 'Grand Dining Experience',
		category: 'Dining Room',
		location: 'Chennai, India',
		year: '2024',
		area: '320 sq ft',
		image: '/images/info7.jpg',
		description: 'Where family gatherings become memorable moments',
	},
	{
		id: 6,
		title: 'Sophisticated Dining Suite',
		category: 'Dining Room',
		location: 'Hyderabad, India',
		year: '2023',
		area: '280 sq ft',
		image: '/images/info8.jpg',
		description: 'Elegance in every detail, comfort in every seat',
	},
	{
		id: 7,
		title: 'Open Living Concept',
		category: 'Dining Room',
		location: 'Kolkata, India',
		year: '2024',
		area: '600 sq ft',
		image: '/images/info11.jpg',
		description: 'Seamless flow between dining and living spaces',
	},
	{
		id: 8,
		title: 'Premium Family Lounge',
		category: 'Living Room',
		location: 'Ahmedabad, India',
		year: '2024',
		area: '550 sq ft',
		image: '/images/info12.jpg',
		description: 'Designed for comfort, built for memories',
	},
	{
		id: 9,
		title: 'Executive Living Area',
		category: 'Living Room',
		location: 'Jaipur, India',
		year: '2023',
		area: '500 sq ft',
		image: '/images/info13.jpg',
		description: 'Sophisticated living for the discerning homeowner',
	},
]

export function ResidentialPortfolio() {
	return (
		<Portfolio
			projects={projects}
			portfolioTitle='Completed'
			portfolioSubtitle='Projects'
			portfolioDescription='Explore our collection of meticulously crafted residential interiors, each telling a unique story of elegance and innovation.'
		/>
	)
}
