import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/crm/", "/visit-team/", "/quotation-team/", "/onboarding/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
