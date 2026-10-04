"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, isSameDay, startOfDay } from "date-fns"
import {
  CalendarDays,
  Clock,
  History,
  Lock,
  Phone,
  Sparkles,
  StickyNote,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DEFAULT_SESSION_MINUTES,
  ServicePicker,
  summarizeServices,
} from "@/components/service-picker"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { formatNumericDateTime, toFa, toFaDigits } from "@/lib/jalali"
import {
  APPOINTMENT_STATUS_LABELS,
  addMinutes,
  combineDateAndTime,
  hasTimeConflict,
  startOfToday,
} from "@/lib/schedule"
import { listForRange } from "@/lib/repositories"
import type {
  AppointmentEdit,
  AppointmentRow,
  AppointmentStatus,
  Service,
  Therapist,
} from "@/lib/repositories"

const STATUS_OPTIONS = Object.entries(APPOINTMENT_STATUS_LABELS) as [
  AppointmentStatus,
  string,
][]

export const QUICK_TIMES = [
  "09:00",
  "10:30",
  "12:00",
  "13:30",
  "15:00",
  "16:30",
  "18:00",
  "19:30",
  "21:00",
  "22:30",
]
const inputClass = "h-11 rounded-lg bg-background"

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

type EditForm = {
  serviceIds: number[]
  therapistId: string
  date: Date | null
  time: string
  status: AppointmentStatus
  notes: string
}

function toForm(appointment: AppointmentRow): EditForm {
  const start = new Date(appointment.start_at)

  return {
    serviceIds: appointment.service_ids,
    therapistId: appointment.therapist_id
      ? String(appointment.therapist_id)
      : "",
    date: startOfDay(start),
    time: `${pad2(start.getHours())}:${pad2(start.getMinutes())}`,
    status: appointment.status,
    notes: appointment.notes ?? "",
  }
}

function isDirty(a: EditForm, b: EditForm) {
  const sameDate =
    a.date === null || b.date === null
      ? a.date === b.date
      : isSameDay(a.date, b.date)

  const sameServices =
    a.serviceIds.length === b.serviceIds.length &&
    [...a.serviceIds]
      .sort((x, y) => x - y)
      .every(
        (id, index) => id === [...b.serviceIds].sort((x, y) => x - y)[index]
      )

  return !(
    sameDate &&
    sameServices &&
    a.therapistId === b.therapistId &&
    a.time === b.time &&
    a.status === b.status &&
    a.notes.trim() === b.notes.trim()
  )
}

type EditBookProps = {
  appointment: AppointmentRow | null
  open: boolean
  onOpenChange: (open: boolean) => void
  services: Service[]
  therapists: Therapist[]
  onSave: (id: number, input: AppointmentEdit) => Promise<void>
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-lg border bg-card p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] leading-tight font-semibold">{title}</h3>
          {hint && (
            <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  )
}

export function EditBook({
  appointment,
  open,
  onOpenChange,
  services,
  therapists,
  onSave,
}: EditBookProps) {
  const [form, setForm] = useState<EditForm | null>(() =>
    appointment === null ? null : toForm(appointment)
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [appointmentsOnDate, setAppointmentsOnDate] = useState<AppointmentRow[]>([])

  const today = startOfToday()

  useEffect(() => {
    if (!open || !form?.date) return

    let active = true
    const from = startOfDay(form.date)

    listForRange(from, addDays(from, 1))
      .then((rows) => {
        if (active) setAppointmentsOnDate(rows)
      })
      .catch(() => {
        if (active) setAppointmentsOnDate([])
      })

    return () => {
      active = false
    }
  }, [open, form?.date])

  const update = <Key extends keyof EditForm>(key: Key, value: EditForm[Key]) =>
    setForm((prev) => (prev === null ? prev : { ...prev, [key]: value }))

  const summary = useMemo(
    () => summarizeServices(services, form?.serviceIds ?? []),
    [services, form?.serviceIds]
  )

  const toggleService = (id: number) =>
    update(
      "serviceIds",
      (form?.serviceIds ?? []).includes(id)
        ? (form?.serviceIds ?? []).filter((item) => item !== id)
        : [...(form?.serviceIds ?? []), id]
    )

  const therapistOptions = therapists.map((item) => ({
    value: String(item.id),
    label: item.specialty ? `${item.name} — ${item.specialty}` : item.name,
  }))

  const endTimeLabel = (() => {
    if (!form?.time) return ""

    const end = addMinutes(
      combineDateAndTime(today, form.time),
      summary.durationMinutes
    )

    return toFaDigits(`${pad2(end.getHours())}:${pad2(end.getMinutes())}`)
  })()

  const selectedTimeHasConflict = Boolean(
    form?.date &&
      form.time &&
      hasTimeConflict(
        form.date,
        form.time,
        summary.durationMinutes,
        appointmentsOnDate,
        appointment?.id
      )
  )

  const dirty =
    appointment !== null && form !== null
      ? isDirty(form, toForm(appointment))
      : false

  const timeChanged = (() => {
    if (appointment === null || form === null) return false
    const original = toForm(appointment)
    return (
      original.time !== form.time ||
      original.date === null ||
      form.date === null ||
      !isSameDay(original.date, form.date)
    )
  })()

  const handleOpenChange = (value: boolean) => {
    if (loading) {
      return
    }

    setError("")

    if (value && appointment !== null) {
      setForm(toForm(appointment))
    }

    onOpenChange(value)
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (appointment === null || form === null) {
      return
    }

    if (!form.date) {
      setError("تاریخ نوبت را از تقویم انتخاب کنید.")
      return
    }

    if (!form.time) {
      setError("ساعت شروع را انتخاب کنید.")
      return
    }

    if (form.date < today) {
      setError("نمی‌توانید نوبت را به روزهای گذشته منتقل کنید.")
      return
    }

    const start = combineDateAndTime(form.date, form.time)
    const end = addMinutes(start, summary.durationMinutes)

    try {
      setLoading(true)
      setError("")
      await onSave(appointment.id, {
        service_ids: summary.services.map((item) => item.id),
        therapist_id: form.therapistId ? Number(form.therapistId) : null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: form.status,
        notes: form.notes.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "ویرایش نوبت با خطا مواجه شد."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-h-[92vh] w-[calc(100%-2rem)] translate-x-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        {appointment !== null && form !== null && (
          <form
            onSubmit={handleSubmit}
            className="flex min-h-0 flex-1 flex-col"
          >
            <DialogHeader className="shrink-0 flex-col gap-4 p-3 text-right sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <CalendarDays className="size-5" />
                </div>
                <div className="space-y-0.5">
                  <DialogTitle className="text-lg font-bold sm:text-xl">
                    ویرایش نوبت
                  </DialogTitle>
                </div>
              </div>

              <div
                className="ml-10 flex items-center gap-3 rounded-lg border bg-muted/40 py-2 pr-2 pl-4"
                title="نام و شماره تماس مشتری در این مرحله قابل تغییر نیست."
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
                  {appointment.full_name.trim().charAt(0)}
                </span>
                <div className="leading-5">
                  <div className="text-sm font-medium">
                    {appointment.full_name}
                  </div>
                  <div
                    dir="ltr"
                    className="flex items-center gap-1 text-right text-xs text-muted-foreground tabular-nums"
                  >
                    <Phone className="size-3" />
                    {appointment.phone.length > 0
                      ? toFaDigits(appointment.phone)
                      : "بدون شماره"}
                  </div>
                </div>
                <Lock className="size-4 text-muted-foreground" />
              </div>
            </DialogHeader>

            <Separator />

            <div className="max-h-[72vh] min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
              <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
                <div className="space-y-4 lg:space-y-5">
                  <Panel
                    icon={Clock}
                    title="تاریخ و ساعت"
                    hint="در ویرایش فقط یک روز از تقویم انتخاب می‌شود."
                  >
                    <Field label="تاریخ نوبت">
                      <DatePicker
                        mode="single"
                        value={form.date ? [form.date] : []}
                        onChange={(value) => update("date", value[0] ?? null)}
                        minDate={today}
                        placeholder="انتخاب تاریخ از تقویم"
                      />
                    </Field>

                    <Panel icon={Clock} title="ساعت جلسه">
                      <div className="flex flex-wrap items-stretch gap-3">
                        <div className="relative w-44">
                          <Input
                            id="session-time"
                            type="time"
                            dir="ltr"
                            value={form.time}
                            onChange={(event) =>
                              update("time", event.target.value)
                            }
                            aria-label="ساعت شروع"
                            aria-invalid={selectedTimeHasConflict}
                            className={cn(
                              "h-14 rounded-lg bg-background pr-11 pl-3 text-center text-2xl font-semibold tracking-wider tabular-nums",
                              selectedTimeHasConflict && "border-destructive",
                              "focus-visible:border-primary",
                              !form.time && "text-muted-foreground",
                              "[&::-webkit-calendar-picker-indicator]:absolute",
                              "[&::-webkit-calendar-picker-indicator]:inset-0",
                              "[&::-webkit-calendar-picker-indicator]:h-full",
                              "[&::-webkit-calendar-picker-indicator]:w-full",
                              "[&::-webkit-calendar-picker-indicator]:cursor-pointer",
                              "[&::-webkit-calendar-picker-indicator]:opacity-0"
                            )}
                          />
                          <Clock className="pointer-events-none absolute inset-y-0 right-3.5 my-auto size-5 text-primary" />
                        </div>

                        <div
                          className={cn(
                            "flex min-w-32 flex-1 flex-col justify-center rounded-lg px-4 text-sm",
                            endTimeLabel
                              ? "bg-primary/10 text-primary"
                              : "border border-dashed text-muted-foreground"
                          )}
                        >
                          {endTimeLabel ? (
                            <>
                              <span className="text-xs opacity-80">
                                پایان جلسه
                              </span>
                              <span className="text-lg font-semibold tabular-nums">
                                {endTimeLabel}
                              </span>
                            </>
                          ) : (
                            <span className="text-xs leading-6">
                              بعد از انتخاب ساعت، ساعت پایان جلسه اینجا نمایش
                              داده می‌شود.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {QUICK_TIMES.map((time) => {
                          const active = form.time === time
                          const busy = Boolean(
                            form.date &&
                              hasTimeConflict(
                                form.date,
                                time,
                                summary.durationMinutes,
                                appointmentsOnDate,
                                appointment?.id
                              )
                          )
                          return (
                            <button
                              key={time}
                              type="button"
                              aria-pressed={active}
                              aria-label={`${toFaDigits(time)}${busy ? "، تداخل با نوبت رزروشده" : ""}`}
                              title={busy ? "با یک نوبت زمان‌بندی‌شده تداخل دارد" : undefined}
                              onClick={() => update("time", time)}
                              className={cn(
                                "rounded-lg border px-3.5 py-1.5 text-sm tabular-nums transition-colors outline-none",
                                "focus-visible:ring-2 focus-visible:ring-ring",
                                busy
                                  ? active
                                    ? "border-destructive bg-destructive font-medium text-destructive-foreground"
                                    : "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15"
                                  : active
                                    ? "border-transparent bg-primary font-medium text-primary-foreground"
                                    : "bg-background hover:bg-muted"
                              )}
                            >
                              {toFaDigits(time)}
                            </button>
                          )
                        })}
                      </div>
                      <p className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="size-2 rounded-full bg-destructive" />
                        قرمز: این ساعت با نوبت زمان‌بندی‌شدهٔ دیگری تداخل دارد.
                      </p>
                      {selectedTimeHasConflict && form.status === "scheduled" && (
                        <p role="alert" className="text-xs text-destructive">
                          ساعت انتخاب‌شده با نوبت دیگری تداخل دارد.
                        </p>
                      )}
                    </Panel>

                    {timeChanged && (
                      <p className="flex items-center gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                        <History className="size-4 shrink-0" />
                        زمان قبلی:{" "}
                        {formatNumericDateTime(new Date(appointment.start_at))}
                      </p>
                    )}
                  </Panel>
                </div>

                <div className="space-y-4 lg:space-y-5">
                  <Panel
                    icon={Sparkles}
                    title="خدمت و متخصص"
                    hint={
                      summary.services.length > 0
                        ? `${toFa(summary.services.length)} خدمت • مجموع ${toFa(summary.durationMinutes)} دقیقه`
                        : `انتخاب خدمت اجباری نیست؛ در نبود خدمت، مدت پیش‌فرض ${toFa(
                            DEFAULT_SESSION_MINUTES
                          )} دقیقه در نظر گرفته می‌شود.`
                    }
                  >
                    <div className="space-y-4">
                      <Field label="خدمات ماساژ (چند انتخابی)">
                        <ServicePicker
                          services={services}
                          selectedIds={form.serviceIds}
                          onToggle={toggleService}
                          onClear={() => update("serviceIds", [])}
                        />
                      </Field>

                      <Field label="متخصص ماساژ">
                        <Select
                          items={therapistOptions}
                          value={form.therapistId}
                          onValueChange={(value) =>
                            update("therapistId", value ? String(value) : "")
                          }
                        >
                          <SelectTrigger className={cn(inputClass, "w-full")}>
                            <SelectValue placeholder="اختیاری" />
                          </SelectTrigger>
                          <SelectContent>
                            {therapistOptions.length === 0 ? (
                              <SelectItem value="__none__" disabled>
                                هنوز متخصصی ثبت نشده است
                              </SelectItem>
                            ) : (
                              therapistOptions.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </Panel>

                  <Panel icon={StickyNote} title="وضعیت و یادداشت">
                    <div className="space-y-4">
                      <Field label="وضعیت نوبت">
                        <div
                          role="radiogroup"
                          aria-label="وضعیت نوبت"
                          className="flex flex-wrap gap-2"
                        >
                          {STATUS_OPTIONS.map(([value, label]) => {
                            const active = form.status === value
                            return (
                              <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                onClick={() => update("status", value)}
                                className={cn(
                                  "flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-colors outline-none",
                                  "focus-visible:ring-2 focus-visible:ring-ring",
                                  active
                                    ? "border-primary bg-primary/10 font-medium text-primary"
                                    : "bg-background hover:bg-muted"
                                )}
                              >
                                <span
                                  className={cn(
                                    "size-2 rounded-lg",
                                    active
                                      ? "bg-primary"
                                      : "bg-muted-foreground/40"
                                  )}
                                />
                                {label}
                              </button>
                            )
                          })}
                        </div>
                      </Field>

                      <Field
                        label="یادداشت نوبت"
                        htmlFor="edit-appointment-notes"
                      >
                        <Textarea
                          id="edit-appointment-notes"
                          placeholder="توضیحات مربوط به این رزرو..."
                          value={form.notes}
                          onChange={(event) =>
                            update("notes", event.target.value)
                          }
                          rows={3}
                          maxLength={2000}
                          className="resize-none rounded-lg bg-background"
                        />
                      </Field>
                    </div>
                  </Panel>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                    >
                      {error}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <DialogFooter className="shrink-0 flex-col-reverse items-stretch gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-start sm:px-6">
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={loading || !dirty}
                  className="h-11 flex-1 rounded-lg px-6 sm:flex-none"
                >
                  {loading ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={() => handleOpenChange(false)}
                  className="h-11 rounded-lg"
                >
                  انصراف
                </Button>
              </div>

              {summary.services.length > 0 && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-2 sm:ms-auto">
                  <Wallet className="size-5 shrink-0 text-primary" />
                  <div className="text-sm font-semibold text-foreground">
                    هزینه: {toFa(summary.totalPrice)} تومان
                  </div>
                </div>
              )}
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
