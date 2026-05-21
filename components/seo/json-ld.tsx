type BreadcrumbItem = {
  name: string
  path: string
}

type BreadcrumbJsonLdProps = {
  items: BreadcrumbItem[]
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.path,
  }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  }

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
}
