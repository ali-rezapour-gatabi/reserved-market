"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { addDays, isSameDay, startOfDay } from "date-fns"
import { ChevronLeft, ChevronRight, ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  formatNumericDate,
  formatNumericMonth,
  formatTime,
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
    const target =
      scrollRef.current?.querySelector<HTMLElement>("[aria-pressed='true']") ??
      scrollRef.current?.querySelector<HTMLElement>("[data-today='true']")
    target?.scrollIntoView({ inline: "center", block: "nearest" })
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
        "space-y-3 rounded-lg bg-card p-4 text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="size-5 text-primary" />
          <div>
            <h2 className="font-bold">نوبت‌ها</h2>
          </div>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={goToday}>
          امروز
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={goPrev}
          aria-label="ماه قبل"
        >
          <ChevronRight className="size-4" />
        </Button>

        <div className="flex flex-1 items-center justify-center gap-2">
          <span className="font-semibold">{formatNumericMonth(jy, jm)}</span>
        </div>

        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={goNext}
          aria-label="ماه بعد"
        >
          <ChevronLeft className="size-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-5">
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
              onClick={() => onSelect(day)}
              className={cn(
                "flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-transparent bg-primary font-medium text-primary-foreground"
                  : "border-transparent bg-muted/50 hover:bg-muted",
                isPast && !isSelected && "opacity-60",
                isToday &&
                  !isSelected &&
                  "border-primary/40 bg-secondary/25 font-medium text-secondary-foreground opacity-100"
              )}
            >
              <span className="text-xs opacity-80">
                {WEEKDAY_SHORT_BY_DAY[day.getDay()]}
              </span>
              <span className="text-lg leading-tight">{toFa(jd)}</span>
              <span className="text-[10px] opacity-70">ماه {toFa(jm)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
