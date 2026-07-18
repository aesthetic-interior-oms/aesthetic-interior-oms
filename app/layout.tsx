import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SiteShell } from "@/components/website/ui/site-shell";
import { siteName, siteUrl } from "@/lib/site";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSerifBengali = Noto_Serif_Bengali({
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-bengali",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteName} | Modern Contemporary Interior Design in Dhaka, Bangladesh`,
    template: `%s | ${siteName}`,
  },
  description:
    "Aesthetic Interior Studio is a pioneer brand for modern contemporary interior design in Dhaka, Bangladesh, serving residential, commercial, and architectural spaces.",
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  keywords: [
    "Aesthetic Interior Studio",
    "aesthetic interior studio in BD",
    "interior design Dhaka",
    "interior design Bangladesh",
    "modern contemporary interior design",
    "residential interior design Dhaka",
    "commercial interior design Bangladesh",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_BD",
    url: siteUrl,
    siteName,
    title: `${siteName} | Interior Design Studio in Dhaka, Bangladesh`,
    description:
      "Modern contemporary residential, commercial, and architectural interior design by Aesthetic Interior Studio in Dhaka, Bangladesh.",
    images: [
      {
        url: "/Logo/HeaderLogo.png",
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Interior Design Studio in Dhaka, Bangladesh`,
    description:
      "A pioneer brand for modern contemporary interior design in Dhaka, Bangladesh.",
    images: ["/Logo/HeaderLogo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6c47ff",
          borderRadius: "8px",
        },
        elements: {
          formButtonPrimary:
            "bg-[#6c47ff] hover:bg-[#5936d9] text-white",
          card: "shadow-xl rounded-2xl",
          headerTitle: "text-2xl font-bold",
          socialButtonsBlockButton:
            "border border-gray-300 hover:bg-gray-100",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${notoSerifBengali.variable} antialiased`}
        >
          <ThemeProvider defaultTheme="light" storageKey="aesthetic-theme">
            <SiteShell>{children}</SiteShell>
            <Toaster richColors />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
