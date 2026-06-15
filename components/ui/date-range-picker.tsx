"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type DateRange = {
  from?: Date
  to?: Date
}

type DateRangePickerProps = {
  value?: DateRange
  onChange?: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
  id?: string
}

type PickerDayProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  date: Date
  displayMonth?: Date
  selected?: DateRange
  modifiers?: Record<string, unknown>
  modifiersStyles?: Record<string, React.CSSProperties>
  isHidden?: boolean
}

function Day(props: PickerDayProps) {
  const { date, selected, className, style, ...rest } = props
  const dateTime = format(date, "yyyy-MM-dd")

  const { from = new Date(0), to = new Date(0) } = (selected ?? {}) as { from?: Date; to?: Date }
  const rangeStart = new Date(from)
  const rangeEnd = new Date(to)

  const startOfRange = new Date(rangeStart)
  startOfRange.setHours(0, 0, 0, 0)
  const endOfRange = new Date(rangeEnd)
  endOfRange.setHours(0, 0, 0, 0)
  const currentMidnight = new Date(date)
  currentMidnight.setHours(0, 0, 0, 0)

  const isInRange = currentMidnight >= startOfRange && currentMidnight <= endOfRange
  const isStart = currentMidnight.getTime() === startOfRange.getTime()
  const isEnd = currentMidnight.getTime() === endOfRange.getTime()

  const base =
    "h-9 w-9 p-0 text-sm font-normal rounded-[4px] inline-flex items-center justify-center"
  const mergedClassName = `${base} ${className ?? ""}`.trim()
  const mergedStyle: React.CSSProperties = { ...style }

  if (isStart || isEnd) {
    mergedStyle.backgroundColor = "#1677ff"
    mergedStyle.color = "#ffffff"
  } else if (isInRange) {
    mergedStyle.backgroundColor = "#e6f4ff"
    mergedStyle.color = "#1677ff"
  }

  return (
    <button type="button" className={mergedClassName} style={mergedStyle} {...rest}>
      {format(date, "d")}
    </button>
  )
}

type SimpleCalendarProps = {
  mode?: "single" | "range"
  selected?: DateRange
  defaultMonth?: Date
  onSelect?: (range: DateRange | undefined) => void
  className?: string
  numberOfMonths?: number
}

function SimpleCalendar({ mode = "range", selected, defaultMonth, onSelect, numberOfMonths = 2 }: SimpleCalendarProps) {
  const today = new Date()
  const base = defaultMonth ?? today
  const months = [new Date(base)]
  if (numberOfMonths > 1) {
    const next = new Date(base)
    next.setMonth(next.getMonth() + 1)
    months.push(next)
  }

  function handleDayClick(date: Date) {
    if (mode !== "range" || !onSelect) return
    const current = (selected ?? {}) as { from?: Date; to?: Date }
    if (!current.from || current.to) {
      onSelect({ from: date, to: undefined })
      return
    }
    if (date < current.from) {
      onSelect({ from: date, to: current.from })
      return
    }
    if (date.getTime() === current.from.getTime()) {
      onSelect({ from: date, to: date })
      return
    }
    onSelect({ from: current.from, to: date })
  }

  return (
    <div className="flex gap-3">
      {months.map((month, idx) => {
        const year = month.getFullYear()
        const monthLabel = format(month, "MMMM yyyy")
        const firstDayOfWeek = 0
        const first = new Date(year, month.getMonth(), 1)
        const startDay = (first.getDay() - firstDayOfWeek + 7) % 7
        const daysInMonth = new Date(year, month.getMonth() + 1, 0).getDate()

        const prevLabel = format(new Date(year, month.getMonth() - 1, 1), "MMMM yyyy")
        const prevDays = new Date(year, month.getMonth(), 0).getDate()

        const cells: React.ReactNode[] = []
        for (let i = startDay - 1; i >= 0; i--) {
          const date = new Date(year, month.getMonth() - 1, prevDays - i)
          cells.push(
            <div key={`prev-${idx}-${i}`} className="h-9 w-9 inline-flex items-center justify-center text-sm text-gray-400">
              {date.getDate()}
            </div>
          )
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month.getMonth(), d)
          cells.push(
            <Day
              key={d}
              date={date}
              selected={selected}
              onClick={(e) => {
                e.preventDefault()
                handleDayClick(date)
              }}
            />
          )
        }
        const remaining = 42 - cells.length
        for (let i = 1; i <= remaining; i++) {
          const date = new Date(year, month.getMonth() + 1, i)
          cells.push(
            <div key={`next-${idx}-${i}`} className="h-9 w-9 inline-flex items-center justify-center text-sm text-gray-400">
              {date.getDate()}
            </div>
          )
        }

        return (
          <div key={idx}>
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-medium text-gray-900">{monthLabel}</div>
              <div className="text-xs text-gray-500">{prevLabel}</div>
            </div>
            <div className="mt-2 flex flex-wrap w-[196px]">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((weekday) => (
                <div key={weekday} className="w-9 text-center text-[10px] font-medium text-gray-500">
                  {weekday}
                </div>
              ))}
              {cells}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DateRangePicker({ value, onChange, placeholder = "Pick a date range", className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const range = value ?? {}
  const label = React.useMemo(() => {
    if (!range.from) return placeholder
    if (!range.to) return format(range.from, "LLL dd, y")
    return `${format(range.from, "LLL dd, y")} - ${format(range.to, "LLL dd, y")}`
  }, [range, placeholder])

  const clear = React.useCallback(() => {
    onChange?.(undefined)
  }, [onChange])

  return (
    <Popover open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          id="date-range"
          className={cn(
            "h-9 w-full justify-start border border-input bg-background px-3 text-left font-normal",
            !range.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate text-sm">{label}</span>
          {range.from ? (
            <span
              role="button"
              tabIndex={0}
              className="ml-auto rounded-md hover:bg-accent hover:text-accent-foreground"
              onClick={(event) => {
                event.stopPropagation()
                event.preventDefault()
                clear()
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  clear()
                }
              }}
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <SimpleCalendar
          mode="range"
          defaultMonth={range.from}
          selected={structuredClone(range)}
          onSelect={(next) => {
            onChange?.(next)
            if (next?.from && next?.to) setOpen(false)
          }}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DateRangePicker, type DateRange }
export default DateRangePicker
