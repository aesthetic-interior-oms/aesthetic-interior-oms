'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { GRID_CELL_BOLD } from '../constants/boq-grid-styles'
import type { BoqSavedAccessoryItem } from '../types/boq-builder-types'

export interface AccessoryItemComboboxProps {
  value: string
  onChange: (val: string) => void
  onSelectItem: (item: BoqSavedAccessoryItem) => void
  savedItems: BoqSavedAccessoryItem[]
  onSaveNewItem?: (name: string) => Promise<void> | void
  placeholder?: string
  className?: string
}

export function AccessoryItemCombobox({
  value,
  onChange,
  onSelectItem,
  savedItems,
  onSaveNewItem,
  placeholder = 'Select or type item name...',
  className,
}: AccessoryItemComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const [isSaving, setIsSaving] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
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

  const q = query.toLowerCase().trim()
  const filteredItems = (savedItems || []).filter((item) => {
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.itemCode && item.itemCode.toLowerCase().includes(q))
    )
  })

  const exactMatch = (savedItems || []).some((it) => it.name.trim().toLowerCase() === q)

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
          onFocus={() => {
            setQuery('')
            openDropdown()
          }}
          placeholder={placeholder}
          className={`${className || GRID_CELL_BOLD} pr-6`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => (isOpen ? closeDropdown() : openDropdown())}
          className="absolute right-1 text-muted-foreground/50 hover:text-foreground p-0.5"
          title="Open saved accessories dropdown"
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
            <div className="px-2 pb-1.5 pt-1 border-b border-border/40">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Search saved items by name, category, or code..."
                autoFocus
                className="w-full px-2 py-1 text-xs rounded border border-border/60 bg-background focus:outline-none focus:ring-1 focus:ring-pink-500/50 placeholder:text-muted-foreground/50"
              />
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-3 text-xs text-center text-muted-foreground">
                  No matching saved items.
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelectItem(item)
                      closeDropdown()
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs text-left hover:bg-pink-500/10 hover:text-pink-900 dark:hover:text-pink-200 transition-colors border-b border-border/20 last:border-b-0 ${
                      value === item.name
                        ? 'bg-pink-500/15 font-semibold text-pink-900 dark:text-pink-200'
                        : 'text-foreground'
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <span className="font-bold text-xs truncate">{item.name}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.category && (
                          <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-medium bg-pink-100 dark:bg-pink-950/50 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/60">
                            {item.category}
                          </span>
                        )}
                        {item.itemCode && (
                          <span className="inline-block text-[10px] px-1.5 py-0.2 rounded font-mono bg-muted text-muted-foreground border border-border/50">
                            {item.itemCode}
                          </span>
                        )}
                      </div>
                    </div>
                    {value === item.name && (
                      <Check className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400 shrink-0" />
                    )}
                  </button>
                ))
              )}

              {onSaveNewItem && q && !exactMatch && (
                <button
                  type="button"
                  disabled={isSaving}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={async () => {
                    setIsSaving(true)
                    try {
                      await onSaveNewItem(query.trim())
                      closeDropdown()
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors border-t border-border/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save &quot;{query.trim()}&quot; to Accessories Library</span>
                </button>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
