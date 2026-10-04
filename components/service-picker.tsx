"use client"

import { Check, Clock, Wallet } from "lucide-react"

import { toFa } from "@/lib/jalali"
import type { Service } from "@/lib/repositories"
import { cn } from "@/lib/utils"

export const DEFAULT_SESSION_MINUTES = 60

export type ServiceSummary = {
  services: Service[]
  durationMinutes: number
  totalPrice: number
}

export function summarizeServices(
  services: Service[],
  selectedIds: number[]
): ServiceSummary {
  const picked = services.filter((item) => selectedIds.includes(item.id))
  const duration = picked.reduce((sum, item) => sum + item.duration_minutes, 0)

  return {
    services: picked,
    durationMinutes: picked.length > 0 ? duration : DEFAULT_SESSION_MINUTES,
    totalPrice: picked.reduce((sum, item) => sum + item.price, 0),
  }
}

type ServicePickerProps = {
  services: Service[]
  selectedIds: number[]
  onToggle: (id: number) => void
  onClear: () => void
}

export function ServicePicker({
  services,
  selectedIds,
  onToggle,
  onClear,
}: ServicePickerProps) {
  if (services.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
        هنوز خدمتی ثبت نشده است؛ نوبت بدون خدمت و با مدت پیش‌فرض ثبت می‌شود.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <div className="max-h-100 overflow-y-auto rounded-lg border bg-background p-1.5">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {services.map((item) => {
            const active = selectedIds.includes(item.id)

            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-right transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-lg border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background"
                  )}
                >
                  {active && <Check className="size-3.5" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {toFa(item.duration_minutes)} دقیقه
                    </span>
                    <span className="flex items-center gap-1">
                      <Wallet className="size-3" />
                      {toFa(item.price)}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg px-1 text-xs text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          حذف انتخاب خدمات
        </button>
      )}
    </div>
  )
}
