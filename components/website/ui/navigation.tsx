"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

const navItems = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Projects", href: "/projects" },
  { name: "How We Work", href: "/how-we-work" },
  { name: "Contact", href: "/contact" },
]

function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname() || "/"
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href)
  return (
    <Link
      href={href}
      className={`${className} ${isActive ? "text-[#a57c00]" : "text-black/80"} transition-colors`}
      aria-current={isActive ? "page" : undefined}
    >
      {children}
    </Link>
  )
}

export function DesktopNavigation() {
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false)
  const [dropdownTimeout, setDropdownTimeout] = useState<number | null>(null)

  return (
    <div className="hidden lg:flex lg:items-center lg:gap-8">
      {navItems.map((item) => {
        if (item.name === "Services") {
          return (
            <div
              key={item.name}
              className="relative"
              onMouseEnter={() => {
                if (dropdownTimeout) {
                  window.clearTimeout(dropdownTimeout)
                  setDropdownTimeout(null)
                }
                setServicesDropdownOpen(true)
              }}
              onMouseLeave={() => {
                const t = window.setTimeout(() => setServicesDropdownOpen(false), 700)
                setDropdownTimeout(t)
              }}
            >
              <NavLink href={item.href} className="text-sm flex items-center gap-1">
                {item.name} <ChevronDown className="h-4 w-4" />
              </NavLink>

              {servicesDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-2 bg-white shadow-lg rounded-md py-2 min-w-[200px]"
                  onMouseEnter={() => {
                    if (dropdownTimeout) {
                      window.clearTimeout(dropdownTimeout)
                      setDropdownTimeout(null)
                    }
                  }}
                  onMouseLeave={() => {
                    const t = window.setTimeout(() => setServicesDropdownOpen(false), 100)
                    setDropdownTimeout(t)
                  }}
                >
                  <Link href="/services/residential" className="block px-4 py-2 text-sm text-black/80 hover:bg-gray-100">
                    Residential Service
                  </Link>
                  <Link href="/services/commercial" className="block px-4 py-2 text-sm text-black/80 hover:bg-gray-100">
                    Commercial Service
                  </Link>
                  <Link href="/services/architectural" className="block px-4 py-2 text-sm text-black/80 hover:bg-gray-100">
                    Architectural Design
                  </Link>
                </div>
              )}
            </div>
          )
        }

        return (
          <NavLink key={item.name} href={item.href} className="text-sm">
            {item.name}
          </NavLink>
        )
      })}
    </div>
  )
}

export function MobileNavigation({ onClose }: { onClose?: () => void }) {
  const router = useRouter()
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)

  return (
    <div className="lg:hidden py-4 border-t border-black/20">
      <div className="flex flex-col gap-4">
        {navItems.map((item) => {
          if (item.name === "Services") {
            return (
              <div key={item.name}>
                <button
                  onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
                  className="text-sm text-black/80 hover:text-[#a57c00] transition-colors flex items-center gap-1 w-full text-left"
                >
                  {item.name} <ChevronDown className="h-4 w-4" />
                </button>
                {mobileServicesOpen && (
                  <div className="ml-4 mt-2 space-y-2">
                    <Link
                      href="/services/residential"
                      className="block text-sm text-black/80 hover:text-[#a57c00]"
                      onClick={() => {
                        onClose?.()
                        setMobileServicesOpen(false)
                      }}
                    >
                      Residential Service
                    </Link>
                    <Link
                      href="/services/commercial"
                      className="block text-sm text-black/80 hover:text-[#a57c00]"
                      onClick={() => {
                        onClose?.()
                        setMobileServicesOpen(false)
                      }}
                    >
                      Commercial Service
                    </Link>
                    <Link
                      href="/services/architectural"
                      className="block text-sm text-black/80 hover:text-[#a57c00]"
                      onClick={() => {
                        onClose?.()
                        setMobileServicesOpen(false)
                      }}
                    >
                      Architectural Design
                    </Link>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm text-black/80 hover:text-[#a57c00] transition-colors"
              onClick={() => onClose?.()}
            >
              {item.name}
            </Link>
          )
        })}

        <Button
          className="bg-[#a57c00] text-white rounded-full w-full mt-2"
          onClick={() => {
            router.push("/contact")
            onClose?.()
          }}
        >
          Book Consultation
        </Button>
      </div>
    </div>
  )
}