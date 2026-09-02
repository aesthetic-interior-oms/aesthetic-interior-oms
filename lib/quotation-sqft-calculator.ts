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

/**
 * Extracts the SQFT value from a draft, in priority order:
 * 1. draft.projectSqft (explicitly saved field)
 * 2. Sum of quantitySqft from short quotation rooms
 * 3. Sum of quantity from detail lineItems with unit sqft/sft
 * 4. fallbackSqft (visit projectSqft)
 */
export function extractDraftSqft(draft: QuotationDraftLike, fallbackSqft = 0): number {
  // First priority: explicitly stored projectSqft on the draft row itself
  if (draft.projectSqft && draft.projectSqft > 0) {
    return Number(draft.projectSqft)
  }

  if (draft.content && typeof draft.content === 'object') {
    const c = draft.content as Record<string, unknown>

    // Some content objects store projectSqft directly in the JSON body
    if (c.projectSqft && Number(c.projectSqft) > 0) {
      return Number(c.projectSqft)
    }

    // Short quotation: rooms[].lines[].quantitySqft
    if (Array.isArray(c.rooms) && c.rooms.length > 0) {
      let shortSqft = 0
      for (const room of c.rooms as any[]) {
        if (room && Array.isArray(room.lines)) {
          shortSqft += (room.lines as any[]).reduce(
            (sum: number, line: any) => sum + (Number(line.quantitySqft) || 0),
            0,
          )
        }
      }
      if (shortSqft > 0) return shortSqft
    }

    // Detail quotation: lineItems with unit sqft/sft (included items)
    if (Array.isArray(c.lineItems) && c.lineItems.length > 0) {
      const detailSqft = (c.lineItems as any[])
        .filter((item: any) => item && item.included !== false && (item.unit === 'sqft' || item.unit === 'sft'))
        .reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0)
      if (detailSqft > 0) return detailSqft
    }
  }

  return fallbackSqft > 0 ? fallbackSqft : 0
}

/**
 * Identifies a detail draft key (handles :owner: suffix).
 * Matches: 'detail', 'detail:slot:2', 'detail:owner:xxx', 'detail:slot:2:owner:xxx'
 */
function isDetailDraftKey(key: string): boolean {
  return key === 'detail' || key.startsWith('detail:')
}

/**
 * Identifies a short draft key (handles :owner: suffix).
 * Matches: 'short:premium', 'short:premium:owner:xxx', etc.
 */
function isShortDraftKey(key: string): boolean {
  return key.startsWith('short:')
}

export function calculateLeadQuotationSqftSummary(
  drafts: QuotationDraftLike[],
  fallbackSqft = 0,
): LeadQuotationSqftSummary {
  const detailDrafts = drafts.filter((d) => isDetailDraftKey(d.draftKey))
  const shortDrafts = drafts.filter((d) => isShortDraftKey(d.draftKey))

  let totalDetailSqft = 0
  for (const draft of detailDrafts) {
    totalDetailSqft += extractDraftSqft(draft, fallbackSqft)
  }
  // If no detail drafts exist yet, use visit fallback as best estimate
  const avgDetailSqft =
    detailDrafts.length > 0
      ? Math.round(totalDetailSqft / detailDrafts.length)
      : fallbackSqft > 0
        ? fallbackSqft
        : 0

  let totalShortSqft = 0
  for (const draft of shortDrafts) {
    totalShortSqft += extractDraftSqft(draft, fallbackSqft)
  }
  const avgShortSqft =
    shortDrafts.length > 0
      ? Math.round(totalShortSqft / shortDrafts.length)
      : fallbackSqft > 0
        ? fallbackSqft
        : 0

  return {
    avgDetailSqft,
    avgShortSqft,
    detailVersionsCount: detailDrafts.length,
    shortPackagesCount: shortDrafts.length,
    totalAvgSqft: avgDetailSqft + avgShortSqft,
  }
}

