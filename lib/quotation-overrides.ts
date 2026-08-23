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
    
    return {
      ...template,
      items: mergedItems
    }
  })
}

export async function getMergedQuotationTemplate(key: string) {
  const templates = await getMergedQuotationTemplates()
  return templates.find(t => t.key === key) || templates[0]
}
