"use client"

import { useMemo, useState } from "react"
import { isSameDay } from "date-fns"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatNumericMonth,
  jalaliMonthGrid,
  jalaliParts,
  shiftJalaliMonth,
  toFa,
} from "@/lib/jalali"
import { WEEKDAY_SHORT, startOfToday } from "@/lib/schedule"

type JalaliView = {
  jy: number
  jm: number
}

type JalaliCalendarProps = {
  selected: Date[]
  onSelect: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  initialMonth?: Date
  className?: string
}

export function JalaliCalendar({
  selected,
  onSelect,
  minDate,
  maxDate,
  initialMonth,
  className,
}: JalaliCalendarProps) {
  const today = useMemo(() => startOfToday(), [])

  const [view, setView] = useState<JalaliView>(() =>
    jalaliParts(initialMonth ?? selected[0] ?? minDate ?? today)
  )

  const cells = useMemo(
    () => jalaliMonthGrid(view.jy, view.jm),
    [view.jy, view.jm]
  )

  const shiftMonth = (delta: number) =>
    setView((prev) => shiftJalaliMonth(prev.jy, prev.jm, delta))

  const isDisabled = (date: Date) =>
    Boolean(minDate && date < minDate) || Boolean(maxDate && date > maxDate)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="سال قبل"
            onClick={() => shiftMonth(-12)}
          >
            <ChevronsRight className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="ماه قبل"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarDays className="size-4 text-primary" />
          {formatNumericMonth(view.jy, view.jm)}
        </span>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="ماه بعد"
            onClick={() => shiftMonth(1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="سال بعد"
            onClick={() => shiftMonth(12)}
          >
            <ChevronsLeft className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
        {WEEKDAY_SHORT.map((label, index) => (
          <span key={`${label}-${index}`} className="py-1 font-medium">
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (cell === null) {
            return <span key={`empty-${index}`} className="aspect-square" />
          }

          const isSelected = selected.some((date) => isSameDay(date, cell))
          const disabled = isDisabled(cell)
          const isToday = isSameDay(cell, today)

          return (
            <button
              key={cell.toISOString()}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              onClick={() => onSelect(cell)}
              className={cn(
                "text-md aspect-square rounded-lg transition-colors outline-none",
                "h-10 w-10 focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "bg-primary font-medium text-primary-foreground"
                  : "hover:bg-accent hover:text-accent-foreground",
                disabled && "cursor-not-allowed opacity-30",
                isToday && !isSelected && "border border-primary/60"
              )}
            >
              {toFa(jalaliParts(cell).jd)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
