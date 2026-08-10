export const siteName = "Aesthetic Interior Studio"

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://aestheticinterior.com"
).replace(/\/$/, "")

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`
}
