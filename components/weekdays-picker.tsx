"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WEEKDAY_NAMES, WEEKDAY_ORDER, sortWeekdays } from "@/lib/schedule"

type WeekdaysPickerProps = {
  value: number[]
  onChange: (value: number[]) => void
  disabled?: boolean
  className?: string
}

export function WeekdaysPicker({
  value,
  onChange,
  disabled,
  className,
}: WeekdaysPickerProps) {
  const toggle = (day: number) =>
    onChange(
      sortWeekdays(
        value.includes(day)
          ? value.filter((item) => item !== day)
          : [...value, day]
      )
    )

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_ORDER.map((day) => {
          const active = value.includes(day)

          return (
            <Button
              key={day}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              disabled={disabled}
              aria-pressed={active}
              onClick={() => toggle(day)}
            >
              {WEEKDAY_NAMES[day]}
            </Button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange(WEEKDAY_ORDER)}
        >
          همه روزها
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          disabled={disabled || value.length === 0}
          onClick={() => onChange([])}
        >
          پاک کردن
        </Button>
      </div>
    </div>
  )
}
