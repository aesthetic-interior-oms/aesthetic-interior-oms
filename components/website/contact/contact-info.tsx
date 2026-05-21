"use client"

import { motion } from "framer-motion"
import { MapPin, Phone, Mail, Clock } from "lucide-react"

const contactMethods = [
    {
    icon: MapPin,
    title: "Office Location",
    details:
      "183, East Senpara, Begum Rokeya Soroni, 3rd Floor, Mirpur 10, Dhaka-1216",
    link: "https://maps.google.com/?q=183+East+Senpara+Begum+Rokeya+Soroni+Mirpur+10+Dhaka-1216",
    linkText: "View on Map",
  },
  {
    icon: Phone,
    title: "Phone",
    details: "+88 0132969 4663",
    link: "tel:+8801329694663",
    linkText: "Call us",
  },
  {
    icon: Mail,
    title: "Email",
    details: "aestheticinterior0029laus@gmail.com",
    link: "mailto:aestheticinterior0029laus@gmail.com",
    linkText: "Send email",
  },
  {
    icon: Clock,
    title: "Business Hours",
    details: "Sun - Thus: 9:00 AM - 6:00 PM",
    link: "#",
    linkText: "Saturday: 10:00 AM - 4:00 PM",
  },
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
    transition: { duration: 0.6 },
  },
}

export function ContactInfo() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-8 lg:sticky lg:top-32"
    >
      <motion.div variants={itemVariants}>
        <h2 className="font-serif text-3xl md:text-4xl font-light text-[#0d3d3d] text-balance">
          Get in Touch
        </h2>
        <p className="mt-3 text-black/60">
          Have questions? We'd love to help. Reach out to us through any of the methods below.
        </p>
      </motion.div>

      <div className="space-y-6">
        {contactMethods.map((method, index) => {
          const Icon = method.icon
          return (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group"
            >
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-[#a57c00]/10 flex items-center justify-center group-hover:bg-[#a57c00]/20 transition-colors duration-200">
                  <Icon className="h-6 w-6 text-[#a57c00]" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#0d3d3d] text-lg">
                    {method.title}
                  </h3>
                  <p className="text-black/70 text-sm mt-1">
                    {method.details}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Why Choose Us */}
      <motion.div
        variants={itemVariants}
        className="pt-8 border-t border-black/10"
      >
        <h3 className="font-serif text-xl font-light text-[#0d3d3d] mb-4">
          Why Work With Us?
        </h3>
        <ul className="space-y-3">
          {[
            "Expert design team with 15+ years experience",
            "Personalized consultation for every project",
            "Transparent pricing with no hidden costs",
            "Timely delivery and exceptional support",
          ].map((item, index) => (
            <motion.li
              key={index}
              variants={itemVariants}
              className="flex gap-3 items-start"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#a57c00] mt-2 flex-shrink-0" />
              <span className="text-black/70 text-sm">{item}</span>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  )
}
