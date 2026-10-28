'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { GRID_CELL_INPUT } from '../constants/boq-grid-styles'

export interface CabinetComboboxProps {
  value: string
  onChange: (val: string) => void
  onBlur?: () => void
  options?: string[]
  groups?: { group: string; items: string[] }[]
  placeholder?: string
  className?: string
}

export function CabinetCombobox({
  value,
  onChange,
  onBlur,
  options = [],
  groups,
  placeholder,
  className,
}: CabinetComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 280),
        zIndex: 9999,
      })
    }
    setIsOpen(true)
  }

  const closeDropdown = () => {
    setIsOpen(false)
    setQuery('')
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
        closeDropdown()
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on scroll/resize so it doesn't drift — but NOT when scrolling inside the dropdown
  useEffect(() => {
    if (!isOpen) return
    const handleScroll = (e: Event) => {
      if (dropdownRef.current && dropdownRef.current.contains(e.target as Node)) return
      closeDropdown()
    }
    const handleResize = () => closeDropdown()
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

  // Filter helpers
  const q = query.toLowerCase().trim()
  const filteredGroups = groups
    ?.map((grp) => ({
      ...grp,
      items: q ? grp.items.filter((item) => item.toLowerCase().includes(q)) : grp.items,
    }))
    .filter((grp) => grp.items.length > 0)

  const filteredOptions = q ? options.filter((opt) => opt.toLowerCase().includes(q)) : options

  const hasResults = groups
    ? (filteredGroups?.some((g) => g.items.length > 0) ?? false)
    : filteredOptions.length > 0

  return (
    <div ref={triggerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value)
            setQuery(e.target.value)
            openDropdown()
          }}
          onFocus={(e) => {
            e.target.select()
            setQuery('')
            openDropdown()
          }}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`${className || GRID_CELL_INPUT} pr-5`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className="absolute right-1 text-muted-foreground/40 hover:text-foreground p-0.5"
          title="Open dropdown"
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
            className="rounded-lg border border-border bg-popover py-1 text-popover-foreground shadow-2xl overflow-hidden"
          >
            {/* Search box inside dropdown */}
            <div className="px-2 pb-1 pt-0.5 border-b border-border/40">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Search..."
                autoFocus
                className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {!hasResults ? (
                <div className="px-3 py-4 text-xs text-center text-muted-foreground">
                  No results for &quot;{query}&quot;
                </div>
              ) : groups && groups.length > 0 ? (
                filteredGroups!.map((grp) => (
                  <div key={grp.group} className="border-b border-border/40 last:border-b-0 pb-1">
                    <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground bg-muted/60 sticky top-0 z-10 backdrop-blur-xs">
                      {grp.group}
                    </div>
                    {grp.items.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          onChange(opt)
                          closeDropdown()
                        }}
                        className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors ${
                          value === opt ? 'bg-primary/15 font-semibold text-primary' : 'text-foreground'
                        }`}
                      >
                        <span className="truncate pr-2">{opt}</span>
                        {value === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                ))
              ) : (
                filteredOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(opt)
                      closeDropdown()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors ${
                      value === opt ? 'bg-primary/15 font-semibold text-primary' : 'text-foreground'
                    }`}
                  >
                    <span className="truncate pr-2">{opt}</span>
                    {value === opt && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
