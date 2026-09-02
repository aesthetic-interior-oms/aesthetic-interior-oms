export type QuotationDraftLike = {
  draftKey: string
  projectSqft?: number | null
  content?: unknown
}

export type LeadQuotationSqftSummary = {
  avgDetailSqft: number
  avgShortSqft: number
  detailVersionsCount: number
  shortPackagesCount: number
  totalAvgSqft: number
}

export function extractDraftSqft(draft: QuotationDraftLike, fallbackSqft: number = 0): number {
  let sqft = draft.projectSqft && draft.projectSqft > 0 ? Number(draft.projectSqft) : 0

  if (sqft <= 0 && draft.content && typeof draft.content === 'object') {
    const contentObj = draft.content as Record<string, unknown>

    // Detail quotation line items
    if (Array.isArray(contentObj.lineItems)) {
      sqft = contentObj.lineItems
        .filter((item: any) => item && item.included && (item.unit === 'sqft' || item.unit === 'sft'))
        .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
    }

    // Short quotation rooms
    if (sqft <= 0 && Array.isArray(contentObj.rooms)) {
      for (const room of contentObj.rooms) {
        if (room && Array.isArray(room.lines)) {
          sqft += room.lines.reduce((sum: number, line: any) => sum + (Number(line.quantitySqft) || 0), 0)
        }
      }
    }
  }

  return sqft > 0 ? sqft : fallbackSqft > 0 ? fallbackSqft : 0
}

export function calculateLeadQuotationSqftSummary(
  drafts: QuotationDraftLike[],
  fallbackSqft: number = 0,
): LeadQuotationSqftSummary {
  const detailDrafts = drafts.filter(
    (d) => d.draftKey === 'detail' || d.draftKey.startsWith('detail:'),
  )
  const shortDrafts = drafts.filter((d) => d.draftKey.startsWith('short:'))

  let totalDetailSqft = 0
  for (const draft of detailDrafts) {
    totalDetailSqft += extractDraftSqft(draft, fallbackSqft)
  }
  const avgDetailSqft =
    detailDrafts.length > 0 ? Math.round(totalDetailSqft / detailDrafts.length) : fallbackSqft > 0 ? fallbackSqft : 0

  let totalShortSqft = 0
  for (const draft of shortDrafts) {
    totalShortSqft += extractDraftSqft(draft, fallbackSqft)
  }
  const avgShortSqft =
    shortDrafts.length > 0 ? Math.round(totalShortSqft / shortDrafts.length) : 0

  return {
    avgDetailSqft,
    avgShortSqft,
    detailVersionsCount: detailDrafts.length,
    shortPackagesCount: shortDrafts.length,
    totalAvgSqft: avgDetailSqft + avgShortSqft,
  }
}
