"use client"

import { useState } from "react"
import { CalendarDays, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { JalaliCalendar } from "@/components/jalali-calendar"
import { cn } from "@/lib/utils"
import { formatNumericDate, toFa } from "@/lib/jalali"
import { formatSession, startOfToday, toggleDate } from "@/lib/schedule"

type DatePickerProps = {
  mode: "single" | "multiple"
  value: Date[]
  onChange: (value: Date[]) => void
  minDate?: Date
  maxDate?: Date
  maxSelection?: number
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  mode,
  value,
  onChange,
  minDate,
  maxDate,
  maxSelection,
  placeholder = "انتخاب تاریخ",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)

  const from = minDate ?? startOfToday()

  const limitReached =
    mode === "multiple" &&
    typeof maxSelection === "number" &&
    value.length >= maxSelection

  const label = () => {
    if (value.length === 0) {
      return placeholder
    }
    if (mode === "single") {
      return formatNumericDate(value[0])
    }
    return `${toFa(value.length)} روز انتخاب شده`
  }

  const handleSelect = (date: Date) => {
    if (mode === "single") {
      onChange([date])
      setOpen(false)
      return
    }

    const isSelected = value.some((item) => item.getTime() === date.getTime())
    if (!isSelected && limitReached) {
      return
    }

    onChange(toggleDate(value, date))
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              aria-expanded={open}
              className="h-11 w-full justify-start"
            >
              <CalendarDays className="ml-2 size-4 text-primary" />
              {label()}
            </Button>
          }
        />

        <PopoverContent className="w-auto p-2" align="start" sideOffset={8}>
          <div
            className={cn(
              "[&_button]:max-h-9 [&_button]:min-h-0 [&_button]:text-sm",
              "[&_button[aria-pressed]]:aspect-auto"
            )}
          >
            <JalaliCalendar
              selected={value}
              onSelect={handleSelect}
              minDate={from}
              maxDate={maxDate}
              initialMonth={value[0]}
            />
          </div>

          {mode === "multiple" && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={value.length === 0}
                onClick={() => onChange([])}
              >
                پاک کردن
              </Button>
              <div className="flex items-center gap-2">
                {typeof maxSelection === "number" && (
                  <span className="text-xs text-muted-foreground">
                    حداکثر {toFa(maxSelection)} روز
                  </span>
                )}
                <Button type="button" size="sm" onClick={() => setOpen(false)}>
                  بستن
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {mode === "multiple" && value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((date) => (
            <span
              key={date.toISOString()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 py-1 ps-3 pe-2 text-xs text-primary"
            >
              {formatSession(date)}
              <button
                type="button"
                aria-label={`حذف ${formatNumericDate(date)}`}
                onClick={() =>
                  onChange(
                    value.filter((item) => item.getTime() !== date.getTime())
                  )
                }
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
