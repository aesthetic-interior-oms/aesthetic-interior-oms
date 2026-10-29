'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { GRID_CELL_INPUT } from '../constants/boq-grid-styles'
import { DEFAULT_CABINET_CATALOG } from '@/lib/boq-cabinet-catalog'

export const PRELAMINATED_OPTIONS = ['Champaign Gold', 'Champagne Gold', 'Elegent', 'Starlight']
export const DUCO_PAINT_OPTIONS = ['Glossy', 'Soft matt']

export interface LaminateFinishPickerProps {
  value: string
  finishType?: 'PRELAMINATED' | 'HPL' | 'DUCO' | 'SOLID' | string
  onChange: (val: string, finishType: 'PRELAMINATED' | 'HPL' | 'DUCO') => void
  hplBrands?: string[]
  isBack?: boolean
  placeholder?: string
}

export function LaminateFinishPicker({
  value,
  finishType,
  onChange,
  hplBrands = DEFAULT_CABINET_CATALOG.hplBrands,
  isBack = false,
  placeholder = 'Select finish...',
}: LaminateFinishPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const detectTab = (): 'PRELAMINATED' | 'HPL' | 'DUCO' => {
    if (finishType === 'HPL' || hplBrands.includes(value)) return 'HPL'
    if (finishType === 'DUCO' || DUCO_PAINT_OPTIONS.includes(value)) return 'DUCO'
    return 'PRELAMINATED'
  }
  const [activeTab, setActiveTab] = useState<'PRELAMINATED' | 'HPL' | 'DUCO'>(detectTab)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: 300,
        zIndex: 9999,
      })
    }
    setIsOpen(true)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on scroll/resize so it doesn't drift — but NOT when scrolling inside the dropdown itself
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      setIsOpen(false)
    }
    const handleResize = () => setIsOpen(false)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  const currentTab = detectTab()
  const isRawBoard = !value || value.trim() === '' || value.toLowerCase().includes('raw')

  const tabBadgeStyle = isRawBoard
    ? 'bg-slate-500/20 text-slate-800 dark:text-slate-200 border border-slate-500/40 hover:bg-slate-500/30'
    : currentTab === 'HPL'
    ? 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 border border-cyan-500/40 hover:bg-cyan-500/30'
    : currentTab === 'DUCO'
    ? 'bg-purple-500/20 text-purple-800 dark:text-purple-200 border border-purple-500/40 hover:bg-purple-500/30'
    : 'bg-amber-500/20 text-amber-800 dark:text-amber-200 border border-amber-500/40 hover:bg-amber-500/30'

  const tabBadgeLabel = isRawBoard
    ? 'Raw'
    : currentTab === 'HPL'
    ? 'HPL'
    : currentTab === 'DUCO'
    ? 'Duco'
    : 'Pre-lam'

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative flex items-center">
        {/* Current type badge */}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setActiveTab(currentTab)
            openDropdown()
          }}
          className={`shrink-0 ml-1 px-1 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase transition-colors ${tabBadgeStyle}`}
          title={isRawBoard ? 'Raw Board (Uncoated) - click to select finish' : 'Click to choose finish type'}
        >
          {tabBadgeLabel}
        </button>

        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            const val = e.target.value
            const detectedHpl = hplBrands.includes(val) || activeTab === 'HPL'
            const detectedDuco = DUCO_PAINT_OPTIONS.includes(val) || activeTab === 'DUCO'
            const fType = detectedHpl ? 'HPL' : detectedDuco ? 'DUCO' : 'PRELAMINATED'
            onChange(val, fType)
            openDropdown()
          }}
          onFocus={(e) => {
            e.target.select()
            openDropdown()
          }}
          placeholder={placeholder || 'Raw Board (None)'}
          className={`${GRID_CELL_INPUT} pl-1.5 pr-5`}
        />

        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          className="absolute right-1 text-muted-foreground/40 hover:text-foreground p-0.5"
          title="Open finish options"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl"
          >
            {/* Top Quick Shortcut: Raw Board (Uncoated) */}
            <div className="mb-1.5 pb-1 border-b border-border/40">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange('', 'PRELAMINATED')
                  setIsOpen(false)
                }}
                className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-slate-500/10 transition-colors ${
                  isRawBoard
                    ? 'bg-slate-500/15 font-bold text-slate-900 dark:text-slate-100'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <span>🪵</span>
                  <span>Raw Board (Uncoated / None)</span>
                </span>
                {isRawBoard && <Check className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />}
              </button>
            </div>

            {/* 3 Tabs */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-muted/60 rounded-md mb-1.5">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveTab('PRELAMINATED')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                  activeTab === 'PRELAMINATED'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🪚 Pre-lam ({PRELAMINATED_OPTIONS.length})
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveTab('HPL')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                  activeTab === 'HPL'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🪵 HPL ({hplBrands.length})
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setActiveTab('DUCO')}
                className={`px-1.5 py-1 text-[10px] font-semibold rounded transition-colors ${
                  activeTab === 'DUCO'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                🎨 Duco ({DUCO_PAINT_OPTIONS.length})
              </button>
            </div>

            {/* Tab Content */}
            <div className="max-h-56 overflow-y-auto divide-y divide-border/30">
              {activeTab === 'PRELAMINATED' && (
                <div className="py-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                    Prelaminated Board Finish
                  </div>
                  {PRELAMINATED_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(opt, 'PRELAMINATED')
                        setIsOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-200 transition-colors ${
                        value === opt && currentTab === 'PRELAMINATED'
                          ? 'bg-amber-500/20 font-bold text-amber-900 dark:text-amber-200'
                          : ''
                      }`}
                    >
                      <span>{opt}</span>
                      {value === opt && currentTab === 'PRELAMINATED' && (
                        <Check className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'HPL' && (
                <div className="py-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                    HPL Pasting (Brand & Code)
                  </div>
                  {hplBrands.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(brand, 'HPL')
                        setIsOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-cyan-500/10 hover:text-cyan-900 dark:hover:text-cyan-200 transition-colors ${
                        value === brand && currentTab === 'HPL'
                          ? 'bg-cyan-500/20 font-bold text-cyan-900 dark:text-cyan-200'
                          : ''
                      }`}
                    >
                      <span>{brand}</span>
                      {value === brand && currentTab === 'HPL' && (
                        <Check className="w-3.5 h-3.5 text-cyan-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'DUCO' && (
                <div className="py-0.5">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Duco Paint Finish
                  </div>
                  {DUCO_PAINT_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onChange(opt, 'DUCO')
                        setIsOpen(false)
                      }}
                      className={`flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-purple-500/10 hover:text-purple-900 dark:hover:text-purple-200 transition-colors ${
                        value === opt && currentTab === 'DUCO'
                          ? 'bg-purple-500/20 font-bold text-purple-900 dark:text-purple-200'
                          : ''
                      }`}
                    >
                      <span>{opt}</span>
                      {value === opt && currentTab === 'DUCO' && (
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {isBack && (
                <div className="pt-1 mt-1">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Common Backing Shortcuts
                  </div>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange('Same as Front (Both Side)', 'PRELAMINATED')
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <span>Same as Front (Both Side)</span>
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange('Single Side Liner', 'PRELAMINATED')
                      setIsOpen(false)
                    }}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 text-xs text-left rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <span>Single Side Liner</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer: Clear button */}
            {value && (
              <div className="pt-1 mt-1 border-t border-border/40 flex justify-end">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange('', 'PRELAMINATED')
                    setIsOpen(false)
                  }}
                  className="px-2 py-1 text-[11px] text-destructive hover:bg-destructive/10 rounded font-medium transition-colors"
                >
                  Clear value
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
