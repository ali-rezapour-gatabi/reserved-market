"use client"

import { useMemo, useState } from "react"
import {
  CalendarDays,
  CalendarRange,
  Clock,
  ListChecks,
  Phone,
  Repeat,
  Sparkles,
  StickyNote,
  User,
  Wallet,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianNumberInput } from "@/components/persian-number-input"
import { Separator } from "@/components/ui/separator"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { WeekdaysPicker } from "@/components/weekdays-picker"
import { cn } from "@/lib/utils"

import { formatNumericDateTime, toFa, toFaDigits } from "@/lib/jalali"
import {
  WEEKDAY_NAMES,
  addMinutes,
  combineDateAndTime,
  formatSession,
  generateWeeklySessions,
  sortWeekdays,
  startOfToday,
  uniqueDates,
  MAX_SESSIONS,
} from "@/lib/schedule"
import type {
  AppointmentStatus,
  NewBooking,
  Service,
  SessionRange,
  Therapist,
} from "@/lib/repositories"

type ScheduleMode = "dates" | "weekly"

type CreateBookProps = {
  services: Service[]
  therapists: Therapist[]
  onCreate: (booking: NewBooking) => Promise<void>
}

const QUICK_TIMES = [
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

const formatClock = (date: Date) =>
  toFaDigits(
    `${String(date.getHours()).padStart(2, "0")}:${String(
      date.getMinutes()
    ).padStart(2, "0")}`
  )

const emptyForm = {
  fullName: "",
  phone: "",
  serviceId: "",
  therapistId: "",
  time: "",
  status: "scheduled" as AppointmentStatus,
  notes: "",
  mode: "dates" as ScheduleMode,
  dates: [] as Date[],
  startDate: [] as Date[],
  weekdays: [] as number[],
  totalSessions: "8",
}

function createEmptyForm(today: Date) {
  return {
    ...emptyForm,
    dates: [today],
    startDate: [today],
  }
}

function Panel({
  icon: Icon,
  title,
  hint,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={cn("space-y-4 rounded-xl border bg-card p-3", className)}
    >
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-[18px]" />
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
  required,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  )
}

const inputClass = "h-11 rounded-xl bg-background text-center"

export function CreateBook({
  services,
  therapists,
  onCreate,
}: CreateBookProps) {
  const [open, setOpen] = useState(false)
  const today = useMemo(() => startOfToday(), [])
  const [form, setForm] = useState(() => createEmptyForm(today))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update = <Key extends keyof typeof emptyForm>(
    key: Key,
    value: (typeof emptyForm)[Key]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const service = services.find((item) => item.id === Number(form.serviceId))

  const requestedTotal = Math.min(
    Math.max(Number(form.totalSessions) || 0, 0),
    MAX_SESSIONS
  )

  const weeklySessions = useMemo(
    () =>
      generateWeeklySessions(form.startDate[0], form.weekdays, requestedTotal),
    [form.startDate, form.weekdays, requestedTotal]
  )

  const sessions = useMemo(
    () => (form.mode === "dates" ? uniqueDates(form.dates) : weeklySessions),
    [form.mode, form.dates, weeklySessions]
  )

  const activeServices = services.filter((item) => item.is_active === 1)

  // برچسب نمایشی هر گزینه؛ با پراپ items به خود Select داده می‌شود تا
  // داخل SelectTrigger نام خدمت/متخصص نمایش داده شود، نه مقدار خام (id)
  const serviceOptions = activeServices.map((item) => ({
    value: String(item.id),
    label: `${item.name} (${toFa(item.duration_minutes)} دقیقه)`,
  }))

  const therapistOptions = therapists.map((item) => ({
    value: String(item.id),
    label: item.specialty ? `${item.name} — ${item.specialty}` : item.name,
  }))

  const selectedWeekdayLabels = sortWeekdays(form.weekdays)
    .map((day) => WEEKDAY_NAMES[day])
    .join("، ")

  const weeksCount =
    form.weekdays.length > 0
      ? Math.ceil(requestedTotal / form.weekdays.length)
      : 0

  const totalPrice = service ? service.price * sessions.length : 0

  // ساعت پایان بر اساس مدت خدمت
  const endTimeLabel = useMemo(() => {
    if (!form.time || !service) return ""
    const start = combineDateAndTime(today, form.time)
    return formatClock(addMinutes(start, service.duration_minutes))
  }, [form.time, service, today])

  const resetForm = () => {
    setForm(createEmptyForm(today))
    setError("")
  }

  const validate = () => {
    if (!form.fullName.trim()) {
      return "نام و نام خانوادگی مشتری را وارد کنید."
    }

    if (!/^09\d{9}$/.test(form.phone.trim())) {
      return "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد."
    }

    if (!service) {
      return "خدمت مورد نظر را انتخاب کنید."
    }

    if (!form.time) {
      return "ساعت شروع را انتخاب کنید."
    }

    if (form.mode === "dates" && sessions.length === 0) {
      return "دست‌کم یک روز را از تقویم انتخاب کنید."
    }

    if (form.mode === "weekly") {
      if (!form.startDate[0]) {
        return "تاریخ شروع را انتخاب کنید."
      }

      if (form.weekdays.length === 0) {
        return "دست‌کم یک روز از هفته را انتخاب کنید."
      }

      if (requestedTotal < 1) {
        return "تعداد جلسات باید دست‌کم ۱ باشد."
      }
    }

    if (sessions.some((date) => date < today)) {
      return "نمی‌توانید برای روزهای گذشته نوبت ثبت کنید."
    }

    return ""
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const message = validate()

    if (message) {
      setError(message)
      return
    }

    if (!service) {
      return
    }

    const payload: NewBooking = {
      customer: {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
      },
      service_id: service.id,
      therapist_id: form.therapistId ? Number(form.therapistId) : null,
      appointment: {
        status: form.status,
        notes: form.notes.trim(),
      },
      sessions: sessions.map((date): SessionRange => {
        const start = combineDateAndTime(date, form.time)
        const end = addMinutes(start, service.duration_minutes)

        return {
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          preview: formatSession(date),
        }
      }),
    }

    try {
      setLoading(true)
      setError("")
      await onCreate(payload)
      resetForm()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت نوبت با خطا مواجه شد.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (loading) {
          return
        }

        setOpen(value)

        if (!value) {
          resetForm()
        }
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <CalendarDays className="size-4" />
            ثبت نوبت جدید
          </Button>
        }
      />

      <DialogContent
        dir="rtl"
        className="max-h-[92vh] w-[calc(100%-2rem)] translate-x-0 flex-col gap-0 p-0 sm:max-w-7xl"
      >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="shrink-0 flex-row items-center gap-3 p-5 text-right sm:p-6">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold sm:text-xl">
                ثبت نوبت جدید
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                اطلاعات مشتری، خدمت و روزهای جلسات را وارد کنید.
              </p>
            </div>
          </DialogHeader>

          <Separator />

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="space-y-4 lg:space-y-5">
                <Panel icon={User} title="اطلاعات مشتری">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="نام و نام خانوادگی"
                      htmlFor="customer-name"
                      required
                    >
                      <div className="relative">
                        <User className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
                        <Input
                          id="customer-name"
                          placeholder="نام مراجعه‌کننده"
                          value={form.fullName}
                          onChange={(event) =>
                            update("fullName", event.target.value)
                          }
                          maxLength={150}
                          className={cn(inputClass, "pr-9")}
                        />
                      </div>
                    </Field>

                    <Field
                      label="شماره موبایل"
                      htmlFor="customer-phone"
                      required
                    >
                      <div className="relative">
                        <Phone className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
                        <PersianNumberInput
                          id="customer-phone"
                          placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                          value={form.phone}
                          onValueChange={(value) => update("phone", value)}
                          maxLength={11}
                          className={cn(
                            inputClass,
                            "pr-3 pl-3 text-left tabular-nums"
                          )}
                        />
                      </div>
                    </Field>
                  </div>
                </Panel>

                <Panel icon={Sparkles} title="خدمت و متخصص">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="خدمت" required>
                      <Select
                        items={serviceOptions}
                        value={form.serviceId}
                        onValueChange={(value) =>
                          update("serviceId", value ? String(value) : "")
                        }
                      >
                        <SelectTrigger className={cn(inputClass, "w-full")}>
                          <SelectValue placeholder="انتخاب خدمت" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                  {activeServices.length === 0 && (
                    <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                      هنوز خدمتی ثبت نشده است؛ برای فعال شدن فرم نوبت، ابتدا یک
                      خدمت اضافه کنید.
                    </p>
                  )}
                </Panel>

                <Panel icon={Clock} title="ساعت جلسه">
                  <div className="flex flex-wrap items-stretch gap-3">
                    <div className="relative w-44">
                      <Input
                        id="session-time"
                        type="time"
                        dir="ltr"
                        value={form.time}
                        onChange={(event) => update("time", event.target.value)}
                        aria-label="ساعت شروع"
                        className={cn(
                          "h-14 rounded-xl border-2 bg-background pr-11 pl-3 text-center text-2xl font-semibold tracking-wider tabular-nums",
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
                        "flex min-w-32 flex-1 flex-col justify-center rounded-xl px-4 text-sm",
                        endTimeLabel
                          ? "bg-primary/10 text-primary"
                          : "border border-dashed text-muted-foreground"
                      )}
                    >
                      {endTimeLabel ? (
                        <>
                          <span className="text-xs opacity-80">پایان جلسه</span>
                          <span className="text-lg font-semibold tabular-nums">
                            {endTimeLabel}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs leading-6">
                          بعد از انتخاب خدمت و ساعت، پایان جلسه اینجا نمایش داده
                          می‌شود.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((time) => {
                      const active = form.time === time
                      return (
                        <button
                          key={time}
                          type="button"
                          aria-pressed={active}
                          onClick={() => update("time", time)}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-sm tabular-nums transition-colors outline-none",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            active
                              ? "border-transparent bg-primary font-medium text-primary-foreground"
                              : "bg-background hover:bg-muted"
                          )}
                        >
                          {toFaDigits(time)}
                        </button>
                      )
                    })}
                  </div>
                </Panel>
              </div>

              <div className="space-y-4 lg:space-y-5">
                <Panel icon={Repeat} title="روزهای جلسات">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={form.mode === "dates" ? "default" : "ghost"}
                      className="rounded-lg"
                      onClick={() => update("mode", "dates")}
                    >
                      انتخاب از تقویم
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={form.mode === "weekly" ? "default" : "ghost"}
                      className="rounded-lg"
                      onClick={() => update("mode", "weekly")}
                    >
                      تکرار هفتگی
                    </Button>
                  </div>

                  {form.mode === "dates" ? (
                    <Field label="تاریخ جلسات (امکان انتخاب چند روز)">
                      <DatePicker
                        mode="multiple"
                        value={form.dates}
                        onChange={(value) => update("dates", value)}
                        minDate={today}
                        maxSelection={MAX_SESSIONS}
                        placeholder="انتخاب روزها"
                      />
                    </Field>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Field label="تاریخ شروع" className="w-3/4">
                          <DatePicker
                            mode="single"
                            value={form.startDate}
                            onChange={(value) => update("startDate", value)}
                            minDate={today}
                            placeholder="انتخاب تاریخ شروع"
                            className="w-full"
                          />
                        </Field>

                        <Field
                          label={`تعداد جلسات`}
                          htmlFor="total-sessions"
                          className="w-1/4"
                        >
                          <PersianNumberInput
                            id="total-sessions"
                            className={cn(inputClass, "text-lg")}
                            value={form.totalSessions}
                            onValueChange={(value) =>
                              update("totalSessions", value)
                            }
                          />
                        </Field>
                      </div>

                      <Field label="روزهای هفته">
                        <WeekdaysPicker
                          value={form.weekdays}
                          onChange={(value) => update("weekdays", value)}
                        />
                      </Field>

                      {form.weekdays.length > 0 && requestedTotal > 0 && (
                        <p className="rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
                          هفته‌ای {toFa(form.weekdays.length)} جلسه (
                          {selectedWeekdayLabels}) در حدود {toFa(weeksCount)}{" "}
                          هفته
                        </p>
                      )}
                    </div>
                  )}

                  {sessions.length > 0 && (
                    <div className="space-y-2.5 rounded-xl border bg-background p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <ListChecks className="size-4 text-primary" />
                        پیش‌نمایش {toFa(sessions.length)} جلسه
                      </div>
                      <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                        {sessions.map((date, index) => (
                          <li
                            key={date.toISOString()}
                            className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs text-primary"
                          >
                            {`${toFa(index + 1)}. ${
                              form.time
                                ? formatNumericDateTime(
                                    combineDateAndTime(date, form.time)
                                  )
                                : formatSession(date)
                            }`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Panel>

                <Panel icon={StickyNote} title="یادداشت نوبت">
                  <Textarea
                    id="appointment-notes"
                    aria-label="یادداشت نوبت"
                    placeholder="توضیحات مربوط به این رزرو..."
                    value={form.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    rows={3}
                    maxLength={2000}
                    className="resize-none rounded-xl bg-background"
                  />
                </Panel>

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
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
                disabled={loading || activeServices.length === 0}
                className="h-11 flex-1 rounded-xl px-6 sm:flex-none"
              >
                <CalendarRange className="size-4" />
                {loading
                  ? "در حال ثبت..."
                  : sessions.length > 1
                    ? `ثبت ${toFa(sessions.length)} جلسه`
                    : "ثبت نوبت"}
              </Button>
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    className="h-11 rounded-xl"
                  >
                    انصراف
                  </Button>
                }
              />
            </div>

            {service && sessions.length > 0 && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-4 py-2 sm:ms-auto">
                <Wallet className="size-5 shrink-0 text-primary" />
                <div className="text-xs leading-5 text-muted-foreground">
                  <div>
                    {toFa(service.price)} تومان × {toFa(sessions.length)} جلسه
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    مجموع: {toFa(totalPrice)} تومان
                  </div>
                </div>
              </div>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
