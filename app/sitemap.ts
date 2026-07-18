import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/site";

const routes = ["/", "/about", "/services", "/services/residential", "/services/commercial", "/services/architectural", "/projects", "/how-we-work", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified,
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
