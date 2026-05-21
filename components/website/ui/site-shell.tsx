"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/website/ui/header";
import { Footer } from "@/components/website/ui/footer";

const APP_ROUTES_WITHOUT_WEBSITE_CHROME = [
  "/crm",
  "/visit-team",
  "/quotation-team",
  "/onboarding",
];

function shouldHideWebsiteChrome(pathname: string) {
  return APP_ROUTES_WITHOUT_WEBSITE_CHROME.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideWebsiteChrome = shouldHideWebsiteChrome(pathname);

  if (hideWebsiteChrome) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
