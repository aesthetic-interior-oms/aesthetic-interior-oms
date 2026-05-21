"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { DesktopNavigation, MobileNavigation } from "./navigation"


const navItems = [
	{ name: "Home", href: "/" },
	{ name: "About", href: "/about" },
	{ name: "Services", href: "/services" },
	{ name: "Projects", href: "/projects" },
	{ name: "How We Work", href: "/how-we-work" },
	{ name: "Contact", href: "/contact" },
]

export function Header() {
	const router = useRouter()
	const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
	const [isVisible, setIsVisible] = useState(true)
	const [lastScrollY, setLastScrollY] = useState(0)
	const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
	const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
	const [dropdownTimeout, setDropdownTimeout] = useState<NodeJS.Timeout | null>(null)

	useEffect(() => {
		const handleScroll = () => {
			const currentScrollY = window.scrollY
			if (currentScrollY > lastScrollY && currentScrollY > 100) {
				// Scrolling down
				setIsVisible(false)
			} else {
				// Scrolling up or at top
				setIsVisible(true)
			}
			setLastScrollY(currentScrollY)
		}

		window.addEventListener("scroll", handleScroll)
		return () => window.removeEventListener("scroll", handleScroll)
	}, [lastScrollY])

	return (
		<header className={`fixed top-0 left-0 right-0 z-50 bg-gray-50 transition-transform duration-300 ${isVisible ? "translate-y-0" : "-translate-y-full"} border-b border-black/10`}>
			<nav className="mx-auto max-w-7xl px-6 lg:px-8">
				<div className="flex h-20 items-center justify-between">
					<Link href="/" className="flex items-center">
						<Image
							src="/Logo/HeaderLogo.png"
							alt="Aesthetic Interior Studio"
							width={220}
							height={72}
							priority
							className="h-12 w-auto"
						/>
						{/* <span className="ml-2 font-serif text-xl text-[#0d3d3d]">Aesthetic Interior Studio</span> */}
					</Link>

					{/* Desktop Navigation */}
					<DesktopNavigation />

					<div className="hidden lg:block">
						<Link href="/contact">
							<Button className="bg-[#0d3d3d] text-white hover:bg-[#1d4343] rounded-full px-6">
								Book Consultation
							</Button>
						</Link>
					</div>

					{/* Mobile Menu Button */}
					<button
						type="button"
						className="lg:hidden"
						onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
					>
						{mobileMenuOpen ? (
							<X className="h-6 w-6 text-black" />
						) : (
							<Menu className="h-6 w-6 text-black" />
						)}
					</button>
				</div>

				{/* Mobile Navigation */}
				{mobileMenuOpen && <MobileNavigation onClose={() => setMobileMenuOpen(false)} />}
			</nav>
		</header>
	)
}
