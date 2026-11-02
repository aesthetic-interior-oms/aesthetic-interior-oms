'use client'

import React from 'react'

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ParsedMaterialScope = {
  isBoardOrPanel: boolean
  thickness?: string
  frontLaminate?: string
  backLaminate?: string
  baseMaterial: string
  subTitle?: string
}

export function parseMaterialScope(item: {
  materialName: string
  specifications: string | null
  variantAttributes: any
}): ParsedMaterialScope {
  const attrs = (item.variantAttributes || {}) as Record<string, any>
  const spec = item.specifications || ''

  // 1. Base Material
  let baseMaterial = (
    attrs.baseMaterial ||
    attrs.coreSubstrateType ||
    item.materialName ||
    'Board'
  ).trim()

  // 2. Thickness
  let thickness = (
    attrs.coreThickness ||
    attrs.thickness ||
    attrs.thicknessSpec ||
    ''
  ).trim()

  if (!thickness && spec) {
    const thkMatch = spec.match(/\b(\d+(?:\.\d+)?\s*(?:mm|inch|"|'))\b/i)
    if (thkMatch) {
      thickness = thkMatch[1].trim()
    }
  }

  // 3. Front Laminate
  let frontLaminate = (
    attrs.frontLaminateCode ||
    attrs.frontLaminate ||
    attrs.laminateTopSurface ||
    attrs.laminateFinishDetails ||
    ''
  ).trim()

  if (frontLaminate.toLowerCase() === 'none (raw)' || frontLaminate.toLowerCase() === 'none') {
    frontLaminate = ''
  }

  if (!frontLaminate && spec) {
    const frontMatch = spec.match(/Front:\s*([^|]+)/i)
    if (frontMatch) {
      frontLaminate = frontMatch[1].trim()
    }
  }

  // 4. Back Laminate
  let backLaminate = (
    attrs.backLaminateCode ||
    attrs.backLaminate ||
    ''
  ).trim()

  if (!backLaminate && attrs.surfaceCodeFinish) {
    const scf = String(attrs.surfaceCodeFinish).trim()
    if (scf.toLowerCase() !== 'raw uncoated' && scf !== frontLaminate) {
      backLaminate = scf
    }
  }

  if (!backLaminate && spec) {
    const backMatch = spec.match(/Back:\s*([^|]+)/i)
    if (backMatch) {
      backLaminate = backMatch[1].trim()
    }
  }

  if (backLaminate.toLowerCase() === 'none (raw)' || backLaminate.toLowerCase() === 'none') {
    backLaminate = ''
  }

  // If spec is piped like "12mm | Garjon Plywood | Beladoa Laminate | 2003 SMT (Super Matt)"
  if ((!frontLaminate || !backLaminate) && spec.includes('|')) {
    const parts = spec.split('|').map((p) => p.trim())
    if (!thickness && /^\d+(?:\.\d+)?\s*(?:mm|inch|"|')/i.test(parts[0])) {
      thickness = parts[0]
    }
    parts.forEach((p) => {
      if (/^front:\s*/i.test(p)) {
        frontLaminate = p.replace(/^front:\s*/i, '').trim()
      } else if (/^back:\s*/i.test(p)) {
        backLaminate = p.replace(/^back:\s*/i, '').trim()
      }
    })
    if (!frontLaminate && parts.length >= 3 && !parts[2].toLowerCase().includes('plywood')) {
      frontLaminate = parts[2]
    }
    if (!backLaminate && parts.length >= 4) {
      backLaminate = parts[3]
    }
  }

  const isBoardOrPanel = Boolean(
    thickness ||
    frontLaminate ||
    backLaminate ||
    attrs.baseMaterial ||
    attrs.coreThickness ||
    attrs.wpSubType === 'CORE_BOARDS' ||
    attrs.cabinetSubType === 'BOARD_SPEC'
  )

  return {
    isBoardOrPanel,
    thickness,
    frontLaminate,
    backLaminate,
    baseMaterial,
    subTitle: attrs.functionalUsage || attrs.usage || attrs.productionPhase || undefined,
  }
}

export function getMaterialDisplayName(item: {
  materialName: string
  specifications: string | null
  variantAttributes: any
}): string {
  const parsed = parseMaterialScope(item)
  if (parsed.isBoardOrPanel) {
    const parts = [parsed.thickness, parsed.frontLaminate, parsed.backLaminate, parsed.baseMaterial].filter(Boolean)
    if (parts.length > 0) return parts.join(' ')
  }
  return item.materialName
}

interface MaterialScopeDisplayProps {
  item: {
    materialName: string
    specifications: string | null
    variantAttributes: any
    productionPhase?: string | null
  }
  subType?: string
}

export function MaterialScopeDisplay({ item, subType }: MaterialScopeDisplayProps) {
  const parsed = parseMaterialScope(item)

  if (parsed.isBoardOrPanel) {
    return (
      <div className="space-y-1">
        {/* Exact sequence: thickness front laminate (blue) back laminate (orange) base material */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm leading-snug">
          {parsed.thickness && (
            <span className="font-bold text-foreground">
              {parsed.thickness}
            </span>
          )}

          {parsed.frontLaminate && (
            <span
              title="Front Laminate"
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 shadow-2xs"
            >
              {parsed.frontLaminate}
            </span>
          )}

          {parsed.backLaminate && (
            <span
              title="Back Laminate"
              className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800 shadow-2xs"
            >
              {parsed.backLaminate}
            </span>
          )}

          <span className="font-semibold text-foreground">
            {parsed.baseMaterial}
          </span>
        </div>

        {/* Secondary Info: SubType Badge + Phase / Usage */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          {subType && (
            <span className="px-1.5 py-0.2 rounded bg-muted font-medium text-muted-foreground">
              {subType}
            </span>
          )}
          {item.productionPhase && <span>{item.productionPhase}</span>}
          {parsed.subTitle && parsed.subTitle !== item.productionPhase && (
            <span>• {parsed.subTitle}</span>
          )}
        </div>
      </div>
    )
  }

  // Non-board items (screws, nails, adhesives, louvers, etc.)
  return (
    <div className="space-y-0.5">
      <div className="font-semibold text-foreground text-xs sm:text-sm">
        {item.materialName}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
        {subType && (
          <span className="px-1.5 py-0.2 rounded bg-muted font-medium text-muted-foreground">
            {subType}
          </span>
        )}
        {item.specifications && (
          <span className="truncate max-w-[260px]">{item.specifications}</span>
        )}
        {item.productionPhase && <span>• {item.productionPhase}</span>}
      </div>
    </div>
  )
}
