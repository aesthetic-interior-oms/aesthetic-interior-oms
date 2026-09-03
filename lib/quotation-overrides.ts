import prisma from '@/lib/prisma'
import { getQuotationTemplate, listQuotationTemplates } from '@/lib/quotation-templates'
import { QuotationTemplateItem } from '@/lib/quotation-types'

export async function getMergedQuotationTemplates() {
  const overrides = await prisma.quotationTemplateOverride.findMany()
  const baseTemplates = listQuotationTemplates()
  
  return baseTemplates.map(base => {
    const template = getQuotationTemplate(base.key)
    const mergedItems = template.items.map(item => {
      const override = overrides.find(o => o.templateKey === base.key && o.itemId === item.id)
      if (override?.isDeleted) return null
      
      return {
        ...item,
        description: override?.description ?? item.description,
        materials: override?.materials ?? item.materials,
        unit: override?.unit ?? item.unit,
        basicRate: override?.basicRate ?? item.basicRate,
        standardRate: override?.standardRate ?? item.standardRate,
        premiumRate: override?.premiumRate ?? item.premiumRate,
      } as QuotationTemplateItem
    }).filter(Boolean) as QuotationTemplateItem[]
    
    const newItems = overrides
      .filter((o) => o.templateKey === base.key && o.isNewItem && !o.isDeleted)
      .map(
        (o) =>
          ({
            id: o.itemId,
            sectionId: o.sectionId || template.sections[0]?.id || 'general',
            description: o.description || 'New Saved Item',
            materials: o.materials || '',
            unit: (o.unit as any) || 'sqft',
            priceMode: (o.priceMode as any) || 'fixed',
            basicRate: o.basicRate ?? 0,
            standardRate: o.standardRate ?? 0,
            premiumRate: o.premiumRate ?? 0,
            rateMin: o.rateMin ?? undefined,
            rateMax: o.rateMax ?? undefined,
          }) satisfies QuotationTemplateItem,
      )

    return {
      ...template,
      items: [...mergedItems, ...newItems],
    }
  })
}

export async function getMergedQuotationTemplate(key: string) {
  const templates = await getMergedQuotationTemplates()
  return templates.find(t => t.key === key) || templates[0]
}
