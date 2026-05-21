"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import {
    MessageSquare,
    Users,
    PenTool,
    FileCheck,
    Receipt,
    Hammer,
    HardHat,
    Eye,
    CheckCircle,
    Camera,
    Home,
} from "lucide-react"

const iconMap = {
    "message-square": MessageSquare,
    users: Users,
    "pen-tool": PenTool,
    "file-check": FileCheck,
    receipt: Receipt,
    hammer: Hammer,
    "hard-hat": HardHat,
    eye: Eye,
    "check-circle": CheckCircle,
    camera: Camera,
    home: Home,
}

interface Step {
    title: string
    description: string
    icon: string
}

interface Stage {
    stageNumber: string
    title: string
    subtitle: string
    description: string
    steps: Step[]
    imageSrc: string
}

interface InteractiveProcessProps {
    stages: Stage[]
}

export function InteractiveProcess({ stages }: InteractiveProcessProps) {
    const [activeStage, setActiveStage] = useState(0)
    const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set())
    const sectionRefs = useRef<(HTMLElement | null)[]>([])

    useEffect(() => {
        const observers = stages.map((_, index) => {
            return new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set(prev).add(index))
                        setActiveStage(index)
                    }
                },
                { threshold: 0.3 },
            )
        })

        sectionRefs.current.forEach((ref, index) => {
            if (ref) observers[index].observe(ref)
        })

        return () => observers.forEach((obs) => obs.disconnect())
    }, [stages])

    return (
        <div className="relative">
            {/* Sticky Timeline Navigation */}
            <div className="hidden lg:block fixed left-8 top-1/2 -translate-y-1/2 z-40">
                <div className="flex flex-col items-center gap-4">
                    {stages.map((stage, index) => (
                        <button
                            key={stage.stageNumber}
                            onClick={() => {
                                sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth" })
                            }}
                            className="group relative"
                        >
                            {/* Connection line */}
                            {index < stages.length - 1 && (
                                <div
                                    className={`absolute top-full left-1/2 -translate-x-1/2 w-0.5 h-4 transition-colors duration-300 ${activeStage > index ? "bg-[#a57c00]" : "bg-gray-300"
                                        }`}
                                />
                            )}

                            {/* Stage dot */}
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-sans font-medium transition-all duration-300 ${activeStage === index
                                        ? "bg-[#a57c00] text-white scale-110 shadow-lg shadow-[#a57c00]/30"
                                        : activeStage > index
                                            ? "bg-[#0d3d3d] text-white"
                                            : "bg-gray-200 text-gray-500 hover:bg-gray-300"
                                    }`}
                            >
                                {stage.stageNumber}
                            </div>

                            {/* Hover tooltip */}
                            <div
                                className={`absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                            >
                                <span className="text-sm font-sans bg-white px-3 py-1.5 rounded-lg shadow-md text-[#0d3d3d]">
                                    {stage.subtitle}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stages */}
            {stages.map((stage, index) => (
                <section
                    key={stage.stageNumber}
                    id={`stage-${stage.stageNumber}`}
                    ref={(el) => {
                        sectionRefs.current[index] = el
                    }}
                    className={`py-20 md:py-32 overflow-hidden ${index % 2 === 0 ? "bg-white" : "bg-[#f8f6f2]"}`}
                >
                    <div className="container mx-auto px-6 lg:px-16">
                        <div className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center`}>
                            {/* Content Side */}
                            <div
                                className={`${index % 2 === 1 ? "lg:order-2" : ""} ${visibleSections.has(index)
                                        ? index % 2 === 1
                                            ? "animate-slide-in-right"
                                            : "animate-slide-in-left"
                                        : "opacity-0"
                                    }`}
                            >
                                {/* Stage Number - Large Background */}
                                <div className="relative mb-8">
                                    <span className="text-[120px] md:text-[180px] font-serif font-bold leading-none text-[#0d3d3d]/5 absolute -top-8 -left-4">
                                        {stage.stageNumber}
                                    </span>
                                    <div className="relative">
                                        <p className="text-sm font-sans tracking-[0.3em] uppercase mb-3 font-medium text-[#a57c00]">
                                            {stage.subtitle}
                                        </p>
                                        <h3 className="text-4xl font-serif text-[#0d3d3d]">{stage.title}</h3>
                                    </div>
                                </div>

                                <p className="text-gray-600 font-sans leading-relaxed mb-10 text-lg">{stage.description}</p>

                                {/* Interactive Steps */}
                                <div className="space-y-4">
                                    {stage.steps.map((step, stepIndex) => (
                                        <StepCard key={stepIndex} step={step} index={stepIndex} stageNumber={stage.stageNumber} />
                                    ))}
                                </div>
                            </div>

                            {/* Image Side */}
                            <div
                                className={`${index % 2 === 1 ? "lg:order-1" : ""} ${visibleSections.has(index)
                                        ? index % 2 === 1
                                            ? "animate-slide-in-left"
                                            : "animate-slide-in-right"
                                        : "opacity-0"
                                    }`}
                            >
                                <ImageCard stage={stage} />
                            </div>
                        </div>
                    </div>
                </section>
            ))}
        </div>
    )
}

function StepCard({ step, index, stageNumber }: { step: Step; index: number; stageNumber: string }) {
    const [isHovered, setIsHovered] = useState(false)
    const Icon = iconMap[step.icon as keyof typeof iconMap]

    return (
        <div
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`group relative p-6 rounded-2xl transition-all duration-500 cursor-pointer border-2 ${isHovered
                    ? "bg-[#0d3d3d] border-[#0d3d3d] shadow-2xl shadow-[#0d3d3d]/20 -translate-y-1"
                    : "bg-white border-gray-100 hover:border-[#0d3d3d]/20"
                }`}
        >
            {/* Shimmer effect on hover */}
            {isHovered && (
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute inset-0 animate-shimmer" />
                </div>
            )}

            <div className="relative flex items-start gap-5">
                {/* Icon Container */}
                <div className={`relative flex-shrink-0 transition-all duration-500 ${isHovered ? "scale-110" : ""}`}>
                    {/* Outer ring */}
                    <div
                        className={`absolute inset-0 rounded-full transition-all duration-500 ${isHovered ? "bg-[#a57c00]/30 scale-150" : "bg-transparent scale-100"
                            }`}
                    />

                    <div
                        className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 ${isHovered ? "bg-[#a57c00]" : "bg-[#0d3d3d]"
                            }`}
                    >
                        {Icon ? (
                            <Icon className="w-6 h-6 text-white" />
                        ) : (
                            <span className="text-white font-sans font-semibold">
                                {stageNumber}.{index + 1}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1">
                    <h4
                        className={`font-sans font-semibold text-lg mb-2 transition-all duration-300 ${isHovered ? "text-white translate-x-1" : "text-[#0d3d3d]"
                            }`}
                    >
                        {step.title}
                    </h4>
                    <p
                        className={`font-sans text-sm leading-relaxed transition-colors duration-300 ${isHovered ? "text-white/80" : "text-gray-600"
                            }`}
                    >
                        {step.description}
                    </p>
                </div>

                {/* Arrow indicator */}
                <div
                    className={`absolute right-6 top-1/2 -translate-y-1/2 transition-all duration-300 ${isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
                        }`}
                >
                    <svg className="w-6 h-6 text-[#a57c00]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                </div>
            </div>
        </div>
    )
}

function ImageCard({ stage }: { stage: Stage }) {
    const [isHovered, setIsHovered] = useState(false)

    return (
        <div className="relative group" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            {/* Background glow */}
            <div
                className={`absolute -inset-6 rounded-3xl transition-all duration-700 ${isHovered ? "bg-[#a57c00]/20 blur-2xl opacity-100" : "bg-[#0d3d3d]/10 blur-xl opacity-50"
                    }`}
            />

            {/* Image container */}
            <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                <Image
                    src={stage.imageSrc || "/placeholder.svg"}
                    alt={`${stage.title} stage interior visual`}
                    width={1200}
                    height={900}
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className={`w-full h-[450px] md:h-[550px] object-cover transition-all duration-700 ${isHovered ? "scale-110" : "scale-100"
                        }`}
                />

                {/* Overlay */}
                <div
                    className={`absolute inset-0 transition-all duration-500 ${isHovered ? "bg-[#0d3d3d]/40" : "bg-[#0d3d3d]/20"
                        }`}
                />

                {/* Stage badge */}
                <div
                    className={`absolute top-6 left-6 transition-all duration-500 ${isHovered ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
                        }`}
                >
                    <div className="bg-[#a57c00] text-white px-4 py-2 rounded-full font-sans text-sm font-medium">
                        Stage {stage.stageNumber}
                    </div>
                </div>

                {/* Bottom info card */}
                <div
                    className={`absolute bottom-0 left-0 right-0 p-6 transition-all duration-500 ${isHovered ? "translate-y-0" : "translate-y-4"
                        }`}
                >
                    <div className="backdrop-blur-xl bg-white/90 rounded-xl p-5 border border-white/50 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-sans font-medium text-[#a57c00] tracking-wide uppercase">{stage.subtitle}</p>
                                <p className="font-serif text-xl text-[#0d3d3d] mt-1">{stage.title}</p>
                            </div>
                            <div
                                className={`w-12 h-12 rounded-full bg-[#0d3d3d] flex items-center justify-center transition-all duration-500 ${isHovered ? "rotate-45 bg-[#a57c00]" : ""
                                    }`}
                            >
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
