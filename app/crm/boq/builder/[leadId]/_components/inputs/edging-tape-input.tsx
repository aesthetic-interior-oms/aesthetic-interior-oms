'use client'

import React from 'react'
import { GRID_CELL_NUM, GRID_CELL_SELECT } from '../constants/boq-grid-styles'

export interface EdgingTapeInputProps {
  value: string
  onChange: (val: string) => void
  defaultUnit?: 'Roll' | 'RFT'
}

export function EdgingTapeInput({
  value,
  onChange,
  defaultUnit = 'RFT',
}: EdgingTapeInputProps) {
  const raw = value || ''
  const isRft = /rft/i.test(raw)
  const isRoll = /roll|role/i.test(raw)
  const unit: 'Roll' | 'RFT' = isRft ? 'RFT' : isRoll ? 'Roll' : defaultUnit
  const numPart = raw.replace(/\s*(rft|roll|role|m|meter).*/i, '').trim()

  return (
    <div className="flex items-center gap-1 min-w-[125px] px-1 py-0.5">
      <input
        type="text"
        value={numPart}
        onChange={(e) => {
          const val = e.target.value.trim()
          onChange(val ? `${val} ${unit}` : '')
        }}
        onFocus={(e) => e.target.select()}
        placeholder="e.g. 50"
        className={`${GRID_CELL_NUM} flex-1 min-w-[50px] border border-border/40 rounded px-1.5 py-1 focus:border-primary`}
      />
      <select
        value={unit}
        onChange={(e) => {
          const newUnit = e.target.value as 'Roll' | 'RFT'
          onChange(numPart ? `${numPart} ${newUnit}` : '')
        }}
        className={`${GRID_CELL_SELECT} w-16 shrink-0 border border-border/40 rounded px-1 py-1 font-semibold text-[11px]`}
      >
        <option value="RFT">RFT</option>
        <option value="Roll">Roll</option>
      </select>
    </div>
  )
}
