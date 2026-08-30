"use client"

import Link from "next/link"
import Image from "next/image"
import { MapPin, Phone, Mail, ArrowRight, Instagram, Facebook, Linkedin, Youtube } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "How We Work", href: "/how-we-work" },
  { name: "Projects", href: "/projects" },
]

const serviceLinks = [
  { name: "Residential Design", href: "/services/residential" },
  { name: "Commercial Design", href: "/services/commercial" },
  { name: "Architectural Design", href: "/services/architectural" },
]

const socialLinks = [
  { name: "Instagram", href: "https://www.instagram.com/aesthetic.interior.studio?fbclid=IwY2xjawPv0MdleHRuA2FlbQIxMABicmlkETBaaVdKYmFNbHBmbDhQQzBMc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHopFyPPSVJSo_PcgVNUgOaKxFFHPfnMRc9vhZI-ZzvjMPFDUhBkDr5jYgPyi_aem_fk9gZ3wagobeJ4KN6iKBHQ", icon: Instagram },
  { name: "Facebook", href: "https://www.facebook.com/aestheticinteriorofficial", icon: Facebook },
  { name: "Linkedin", href: "https://www.linkedin.com/company/aesthetic-interior-studio", icon: Linkedin },
  { name: "YouTube", href: "https://www.youtube.com/@AestheticInteriorofficial", icon: Youtube },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
}

export function Footer() {
  return (
    <footer id="contact" className="bg-gradient-to-b from-[#0d3d3d] to-[#051e1e] text-white relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#a57c00]/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#a57c00]/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Newsletter Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-7xl px-6 lg:px-8 py-12 lg:py-16 border-b border-white/10"
      >
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-2xl lg:text-3xl font-serif text-white mb-2">
              Ready to Transform Your Space?
            </h3>
            <p className="text-white/70">Subscribe to our newsletter for design inspiration and exclusive offers.</p>
          </div>
          <motion.div
            className="flex gap-2"
            variants={itemVariants}
          >
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-white/10 border border-white/20 rounded-full px-6 py-3 text-white placeholder:text-white/50 focus:outline-none focus:border-[#a57c00] transition-colors"
            />
            <Button className="bg-[#a57c00] text-white hover:bg-[#c99a00] rounded-full px-6 flex items-center gap-2">
              Subscribe <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Main Footer Content */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 py-16 lg:py-20">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8"
        >
          {/* Brand Section */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Link href="/" className="inline-block group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Image
                  src="/images/logo3.png"
                  alt="Aesthetic Interior Studio"
                  width={160}
                  height={70}
                  loading="lazy"
                  className="h-auto w-40 group-hover:opacity-80 transition-opacity"
                />
              </motion.div>
            </Link>
            <p className="mt-6 text-white/70 leading-relaxed text-sm">
              Transforming spaces into beautiful, functional environments that reflect your unique style and vision.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((link) => {
                const IconComponent = link.icon
                return (
                  <motion.div
                    key={link.name}
                    whileHover={{ scale: 1.2, y: -5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Link
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/70 hover:bg-[#a57c00] hover:border-[#a57c00] hover:text-white transition-all duration-300"
                      title={link.name}
                    >
                      <IconComponent className="h-5 w-5" />
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[#a57c00] mb-6">Navigation</h3>
            <ul className="space-y-4">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 text-sm hover:text-[#a57c00] transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#a57c00]/0 group-hover:bg-[#a57c00] transition-colors" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Services */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[#a57c00] mb-6">Services</h3>
            <ul className="space-y-4">
              {serviceLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-white/70 text-sm hover:text-[#a57c00] transition-colors inline-flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-[#a57c00]/0 group-hover:bg-[#a57c00] transition-colors" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact Info */}
          <motion.div variants={itemVariants}>
            <h3 className="font-semibold text-sm uppercase tracking-widest text-[#a57c00] mb-6">Contact</h3>
            <div className="space-y-4">
              <motion.a
                href="#"
                whileHover={{ x: 5 }}
                className="flex items-start gap-3 text-white/70 hover:text-[#a57c00] transition-colors group"
              >
                <MapPin className="h-5 w-5 text-[#a57c00] mt-0.5 flex-shrink-0" />
                <span className="text-sm">183, East Senpara, Begum Rokeya Soroni , 3rd floor, Mirpur 10 , Dhaka-1216</span>
              </motion.a>
              <motion.a
                href="tel:+8801329694663"
                whileHover={{ x: 5 }}
                className="flex items-center gap-3 text-white/70 hover:text-[#a57c00] transition-colors"
              >
                <Phone className="h-5 w-5 text-[#a57c00] flex-shrink-0" />
                <span className="text-sm">+88 0132969 4663</span>
              </motion.a>
              <motion.a
                href="mailto:aestheticinterior0029laus@gmail.com"
                whileHover={{ x: 5 }}
                className="flex items-center gap-3 text-white/70 hover:text-[#a57c00] transition-colors"
              >
                <Mail className="h-5 w-5 text-[#a57c00] flex-shrink-0" />
                <span className="text-sm break-all">hello@aestheticinteriorbd.com</span>
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        viewport={{ once: true }}
        className="relative mx-auto max-w-7xl px-6 lg:px-8 py-8 border-t border-white/10"
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/50 text-center md:text-left">
            © {new Date().getFullYear()} Aesthetic Interior Studio. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-white/50">
            <Link href="#" className="hover:text-[#a57c00] transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-[#a57c00] transition-colors">Terms of Service</Link>
          </div>
        </div>
      </motion.div>
    </footer>
  )
}
