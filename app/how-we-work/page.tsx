import type { Metadata } from "next"
import { StagesIntro } from "@/components/website/how-we-work/stages-intro"
import { InteractiveProcess } from "@/components/website/how-we-work/interactive-process"
import { TeamSection } from "@/components/website/how-we-work/team-section"
import { CtaSection } from "@/components/website/how-we-work/cta-section"
import { HowWeWorkHero } from "@/components/website/how-we-work/hero-section"
import { BreadcrumbJsonLd } from "@/components/seo/json-ld"

export const metadata: Metadata = {
  title: "How We Work | Aesthetic Interior",
  description:
    "Discover our 5-stage design process - from initial consultation to project handover. Experience a smooth journey from idea to installation.",
  alternates: {
    canonical: "/how-we-work",
  },
}

const stages = [
  {
    stageNumber: "01",
    title: "Let's Start With Your Vision",
    subtitle: "Initial Connection",
    description:
      "Everything begins with a simple form. Share your lifestyle, preferences, and ideas with us. The better we understand you, the more precisely we can design your space.",
    steps: [
      {
        title: "Share Your Requirements",
        description: "Fill out our detailed form with your preferences, lifestyle needs, and design inspirations.",
        icon: "message-square",
      },
      {
        title: "Personalized Consultation",
        description:
          "One of our experts will connect with you to discuss your requirements, preferred design styles, packages, and similar completed projects. Based on this, we provide an initial budget guideline for your space.",
        icon: "users",
      },
    ],
    imageSrc: "/modern-interior-design-consultation-meeting.jpg",
  },
  {
    stageNumber: "02",
    title: "Bringing Ideas to Life",
    subtitle: "Design Creation",
    description:
      "Secure the project by paying 5% of the estimated budget. This allows us to begin crafting your personalized 3D interior design.",
    steps: [
      {
        title: "Confirm Your Booking",
        description: "Secure the project with an initial payment to kickstart the design process.",
        icon: "file-check",
      },
      {
        title: "Design Finalization",
        description:
          "We combine your needs with our design expertise to develop a refined concept that perfectly aligns with your taste and functional goals.",
        icon: "pen-tool",
      },
      {
        title: "Detailed Cost Planning",
        description:
          "A complete and transparent budget is prepared based on finalized materials, layouts, and finishes.",
        icon: "receipt",
      },
    ],
    imageSrc: "/3d-interior-design-rendering-modern-living-room.jpg",
  },
  {
    stageNumber: "03",
    title: "Making It Real",
    subtitle: "Execution Begins",
    description:
      "Move forward with 65% payment to initiate production. Working drawings will be shared within 7 days for your review and approval.",
    steps: [
      {
        title: "Approve & Proceed",
        description: "Review and approve the final designs and working drawings before production begins.",
        icon: "check-circle",
      },
      {
        title: "Site Preparation & Production",
        description:
          "Material procurement and on-site preparation begin. You'll be able to track progress through our structured project timeline and Gantt chart updates.",
        icon: "hammer",
      },
    ],
    imageSrc: "/interior-construction-woodwork-production-site.jpg",
  },
  {
    stageNumber: "04",
    title: "Precision at Work",
    subtitle: "Installation Phase",
    description: "At 95% project completion milestone, major woodwork is finished and painting enters its final phase.",
    steps: [
      {
        title: "Final Execution Stage",
        description: "Major structural and woodwork elements are completed with meticulous attention to detail.",
        icon: "hard-hat",
      },
      {
        title: "51-Point Quality Inspection",
        description:
          "Our team performs 51 professional quality inspections to ensure every detail is executed flawlessly before handover.",
        icon: "eye",
      },
    ],
    imageSrc: "/interior-installation-woodwork-finishing-luxury.jpg",
  },
  {
    stageNumber: "05",
    title: "Step Into Your New Space",
    subtitle: "Project Handover",
    description:
      "Your interior is complete and ready for living. We celebrate your transformation with a complimentary professional photoshoot and a memorable handover experience.",
    steps: [
      {
        title: "Final Walkthrough",
        description: "A complete tour of your finished space with all final touches in place.",
        icon: "home",
      },
      {
        title: "Complimentary Photoshoot",
        description: "Capture the beauty of your new space with a professional photography session.",
        icon: "camera",
      },
    ],
    imageSrc: "/completed-luxury-interior-living-room-photoshoot.jpg",
  },
]

export default function HowWeWorkPage() {
  return (
    <main className="min-h-screen bg-[#faf9f6] overflow-x-hidden">
      <BreadcrumbJsonLd items={[{ name: "Home", path: "/" }, { name: "How We Work", path: "/how-we-work" }]} />
      <HowWeWorkHero />
      <StagesIntro />
      <InteractiveProcess stages={stages} />
      <TeamSection />
      <CtaSection />
    </main>
  )
}
