import { absoluteUrl, siteName, siteUrl } from "@/lib/site"

type BreadcrumbItem = {
  name: string
  path: string
}

export function LocalBusinessJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: siteName,
    image: absoluteUrl("/images/logo3.png"),
    url: siteUrl,
    telephone: "+8801329694663",
    email: "hello@aestheticinterior.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "183, East Senpara, Begum Rokeya Soroni, Mirpur 10",
      addressLocality: "Dhaka",
      postalCode: "1216",
      addressCountry: "BD",
    },
    areaServed: "Bangladesh",
    sameAs: [
      "https://www.facebook.com/aestheticinteriorofficial",
      "https://www.instagram.com/aesthetic.interior.studio",
      "https://www.linkedin.com/company/aesthetic-interior-studio",
      "https://www.youtube.com/@AestheticInteriorofficial",
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function ServiceJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Interior Design",
    provider: {
      "@type": "LocalBusiness",
      name: siteName,
      url: siteUrl,
    },
    areaServed: "Bangladesh",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Interior Design Services",
      itemListElement: [
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Residential Interior Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Commercial Interior Design" } },
        { "@type": "Offer", itemOffered: { "@type": "Service", name: "Architectural Interior Design" } },
      ],
    },
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function FaqJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "বাসা ইন্টেরিয়রের খরচ কত",
        acceptedAnswer: {
          "@type": "Answer",
          text: "বাসার আকার, ডিজাইন, ম্যাটেরিয়াল ও ফিনিশিং অনুযায়ী খরচ পরিবর্তিত হয়। সঠিক বাজেট জানতে সাইট ভিজিট ও রিকোয়ারমেন্ট বিশ্লেষণ প্রয়োজন।",
        },
      },
      {
        "@type": "Question",
        name: "বাসা ইন্টেরিয়র করতে সর্বনিম্ন কত টাকা লাগবে? কি কি আইটেম থাকবে?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "সর্বনিম্ন বাজেট নির্ভর করে কাজের পরিধি ও ম্যাটেরিয়ালের উপর। সাধারণত স্পেস প্ল্যানিং, সিলিং/লাইটিং, ফার্নিচার, স্টোরেজ, পেইন্ট ও ফিনিশিং আইটেম অন্তর্ভুক্ত থাকে।",
        },
      },
      {
        "@type": "Question",
        name: "অফিস ইন্টেরিয়র করতে কত টাকা লাগবে",
        acceptedAnswer: {
          "@type": "Answer",
          text: "অফিসের স্কয়ারফিট, ব্র্যান্ডিং, লেআউট ও ওয়ার্কস্টেশন প্রয়োজন অনুযায়ী বাজেট নির্ধারিত হয়। কনসালটেশনের পর ডিটেইলড কস্ট ব্রেকডাউন দেওয়া হয়।",
        },
      },
    ],
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
}
