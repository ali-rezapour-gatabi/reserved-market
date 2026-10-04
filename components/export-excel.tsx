"use client"

import * as React from "react"
import { addDays, startOfDay } from "date-fns"
import { CalendarRange, FileSpreadsheet, Loader2 } from "lucide-react"
import writeXlsxFile, { type Cell } from "write-excel-file/browser"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  formatNumericDate,
  formatNumericDateTime,
  jalaliParts,
  startOfJalaliMonth,
  toFaDigits,
} from "@/lib/jalali"
import { APPOINTMENT_STATUS_LABELS, startOfToday } from "@/lib/schedule"
import { listForRange } from "@/lib/repositories"
import type { AppointmentRow } from "@/lib/repositories"

const HEADERS = ["تاریخ و ساعت", "مشتری", "خدمت", "متخصص", "وضعیت"]

const COLUMN_WIDTHS = [26, 34, 28, 22, 16]

function toCell(value: string): Cell {
  return { value, type: String, align: "right" }
}

function toHeaderCell(title: string): Cell {
  return {
    value: title,
    type: String,
    align: "center",
    fontWeight: "bold",
    backgroundColor: "#dcebe8",
  }
}

function fileNameFor(from: Date, to: Date) {
  const start = jalaliParts(from)
  const end = jalaliParts(to)

  const pad = (value: number, length: number) =>
    String(value).padStart(length, "0")

  return `appointments-${pad(start.jy, 4)}${pad(start.jm, 2)}${pad(
    start.jd,
    2
  )}_${pad(end.jy, 4)}${pad(end.jm, 2)}${pad(end.jd, 2)}.xlsx`
}

function buildSheet(rows: AppointmentRow[]) {
  const header = HEADERS.map(toHeaderCell)

  const body = rows.map((row) => [
    toCell(formatNumericDateTime(new Date(row.start_at))),
    toCell(
      row.phone.length > 0
        ? `${row.full_name} (${toFaDigits(row.phone)})`
        : row.full_name
    ),
    toCell(
      row.service_names.length > 0 ? row.service_names.join("، ") : "بدون خدمت"
    ),
    toCell(row.therapist_name ?? "—"),
    toCell(APPOINTMENT_STATUS_LABELS[row.status] ?? row.status),
  ])

  return [header, ...body]
}

export function ExportExcelButton() {
  const today = React.useMemo(() => startOfToday(), [])
  const [open, setOpen] = React.useState(false)
  const [from, setFrom] = React.useState<Date>(today)
  const [to, setTo] = React.useState<Date>(today)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const handleOpenChange = (value: boolean) => {
    if (loading) {
      return
    }

    setOpen(value)

    if (value) {
      setFrom(startOfJalaliMonth(today))
      setTo(today)
      setError("")
    }
  }

  const handleExport = async () => {
    if (startOfDay(from) > startOfDay(to)) {
      setError("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.")
      return
    }

    try {
      setLoading(true)
      setError("")

      const rows = await listForRange(
        startOfDay(from),
        addDays(startOfDay(to), 1)
      )

      if (rows.length === 0) {
        setError("در این بازه هیچ نوبتی ثبت نشده است.")
        return
      }

      await writeXlsxFile(buildSheet(rows), {
        sheet: "نوبت‌ها",
        columns: COLUMN_WIDTHS.map((width) => ({ width })),
        rightToLeft: true,
      }).toFile(fileNameFor(from, to))

      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "خروجی گرفتن با خطا مواجه شد.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button type="button" size="sm" variant="outline">
            <FileSpreadsheet className="size-4" />
            دریافت خروجی اکسل
          </Button>
        }
      />

      <DialogContent
        dir="rtl"
        className="w-[calc(100%-2rem)] translate-x-0 gap-0 p-0 sm:max-w-lg"
      >
        <DialogHeader className="shrink-0 flex-row items-center gap-3 p-5 text-right">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FileSpreadsheet className="size-5" />
          </div>
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">
              دریافت خروجی اکسل
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              بازهٔ پیش‌فرض از اول ماه جاری تا امروز است.
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4 border-t bg-muted/30 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[13px] text-muted-foreground">
                از تاریخ
              </Label>
              <DatePicker
                mode="single"
                value={[from]}
                onChange={(value) => {
                  if (value[0]) {
                    setFrom(value[0])
                  }
                }}
                minDate={today}
                placeholder="انتخاب تاریخ شروع"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px] text-muted-foreground">
                تا تاریخ
              </Label>
              <DatePicker
                mode="single"
                value={[to]}
                onChange={(value) => {
                  if (value[0]) {
                    setTo(value[0])
                  }
                }}
                minDate={today}
                placeholder="انتخاب تاریخ پایان"
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg bg-card p-3">
            <CalendarRange className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="text-xs leading-6">
              <div className="font-medium text-foreground">ستون‌های خروجی</div>
              <p className="text-muted-foreground">{HEADERS.join(" • ")}</p>
              <p className="mt-1 text-muted-foreground">
                بازه: {formatNumericDate(from)} تا {formatNumericDate(to)}
              </p>
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 flex-col-reverse items-stretch gap-2 border-t p-4 sm:flex-row sm:justify-start">
          <Button
            type="button"
            disabled={loading}
            onClick={handleExport}
            className="h-11 flex-1 rounded-lg px-6 sm:flex-none"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="size-4" />
            )}
            {loading ? "در حال ساخت فایل..." : "دریافت فایل اکسل"}
          </Button>

          <DialogClose
            render={
              <Button
                type="button"
                variant="outline"
                disabled={loading}
                className="h-11 rounded-lg"
              >
                انصراف
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}