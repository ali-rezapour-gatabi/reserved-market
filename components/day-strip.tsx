"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDays, isSameDay, startOfDay } from "date-fns"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatNumericMonth,
  jalaliParts,
  startOfJalaliMonth,
  toFa,
} from "@/lib/jalali"

const WEEKDAY_SHORT_BY_DAY = ["ی", "د", "س", "چ", "پ", "ج", "ش"]

function jalaliMonthLength(monthStart: Date) {
  const { jm } = jalaliParts(monthStart)
  let length = 29
  while (jalaliParts(addDays(monthStart, length)).jm === jm) length++
  return length
}

type DayStripProps = {
  selected: Date | null
  onSelect: (date: Date) => void
  className?: string
}

export function DayStrip({ selected, onSelect, className }: DayStripProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [monthStart, setMonthStart] = useState<Date>(() =>
    startOfJalaliMonth(today)
  )

  const monthLength = useMemo(() => jalaliMonthLength(monthStart), [monthStart])

  const days = useMemo(
    () => Array.from({ length: monthLength }, (_, i) => addDays(monthStart, i)),
    [monthStart, monthLength]
  )

  const { jy, jm } = jalaliParts(monthStart)

  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const container = scrollRef.current
    const target =
      container?.querySelector<HTMLElement>("[aria-pressed='true']") ??
      container?.querySelector<HTMLElement>("[data-today='true']")

    if (!container || !target) return

    const containerRect = container.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    container.scrollBy({
      left:
        targetRect.left -
        containerRect.left -
        (containerRect.width - targetRect.width) / 2,
      behavior: "smooth",
    })
  }, [monthStart, selected])

  const goNext = () =>
    setMonthStart(startOfJalaliMonth(addDays(monthStart, monthLength)))
  const goPrev = () =>
    setMonthStart(startOfJalaliMonth(addDays(monthStart, -1)))
  const goToday = () => {
    setMonthStart(startOfJalaliMonth(today))
    onSelect(today)
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarDays className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">انتخاب روز</h2>
            <p className="text-xs text-muted-foreground">
              {formatNumericMonth(jy, jm)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={goToday}>
            امروز
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={goPrev}
              aria-label="ماه قبل"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={goNext}
              aria-label="ماه بعد"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3"
        aria-label="روزهای ماه"
      >
        {days.map((day) => {
          const { jd } = jalaliParts(day)
          const isToday = isSameDay(day, today)
          const isSelected = selected !== null && isSameDay(day, selected)
          const isPast = day < today

          return (
            <button
              key={day.toISOString()}
              type="button"
              aria-pressed={isSelected}
              data-today={isToday}
              aria-label={`${WEEKDAY_SHORT_BY_DAY[day.getDay()]}، ${toFa(jd)} ${formatNumericMonth(jy, jm)}`}
              onClick={() => onSelect(day)}
              className={cn(
                "flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border text-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary bg-primary font-medium text-primary-foreground shadow-sm"
                  : "border-transparent bg-muted/50 hover:bg-muted",
                isPast && !isSelected && "opacity-60",
                isToday &&
                  !isSelected &&
                  "border-secondary bg-secondary/30 font-medium text-secondary-foreground opacity-100"
              )}
            >
              <span className="text-[11px] leading-none opacity-80">
                {WEEKDAY_SHORT_BY_DAY[day.getDay()]}
              </span>
              <span className="text-lg leading-none tabular-nums">
                {toFa(jd)}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
