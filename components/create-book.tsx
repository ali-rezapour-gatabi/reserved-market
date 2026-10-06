"use client"

import { useEffect, useMemo, useState } from "react"
import { addDays, startOfDay } from "date-fns"
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
import { CustomerSearch } from "@/components/customer-search"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianNumberInput } from "@/components/persian-number-input"
import {
  DEFAULT_SESSION_MINUTES,
  ServicePicker,
  summarizeServices,
} from "@/components/service-picker"
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
  hasTimeConflict,
  MAX_SESSIONS,
} from "@/lib/schedule"
import type {
  AppointmentRow,
  AppointmentStatus,
  NewBooking,
  Service,
  SessionRange,
  Therapist,
} from "@/lib/repositories"
import { listForRange } from "@/lib/repositories"

type ScheduleMode = "dates" | "weekly"

export type CreateBookPrefill = {
  fullName: string
  phone: string
  serviceIds: number[]
  therapistId: string
  notes?: string
  time?: string
}

type CreateBookProps = {
  services: Service[]
  therapists: Therapist[]
  onCreate: (booking: NewBooking) => Promise<void>
  prefill?: CreateBookPrefill
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  trigger?: React.ReactNode
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
  serviceIds: [] as number[],
  price: "",
  therapistId: "",
  time: "",
  status: "scheduled" as AppointmentStatus,
  notes: "",
  mode: "dates" as ScheduleMode,
  dates: [] as Date[],
  startDate: [] as Date[],
  weekdays: [] as number[],
  totalSessions: "4",
  referral: "",
}

function createEmptyForm(today: Date, prefill?: CreateBookPrefill) {
  return {
    ...emptyForm,
    fullName: prefill?.fullName ?? "",
    phone: prefill?.phone ?? "",
    serviceIds: prefill?.serviceIds ?? [],
    therapistId: prefill?.therapistId ?? "",
    notes: prefill?.notes ?? "",
    time: prefill?.time ?? "",
    dates: [today],
    startDate: [today],
    referral: "",
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
      className={cn("space-y-4 rounded-lg border bg-card p-3", className)}
    >
      <header className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
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

const inputClass = "h-11 rounded-lg bg-background text-center"

export function CreateBook({
  services,
  therapists,
  onCreate,
  prefill,
  open: openProp,
  onOpenChange,
  title = "ثبت نوبت جدید",
  trigger,
}: CreateBookProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = openProp !== undefined
  const open = isControlled ? openProp : uncontrolledOpen
  const today = useMemo(() => startOfToday(), [])
  const [form, setForm] = useState(() => createEmptyForm(today, prefill))
  const [appointmentsOnDates, setAppointmentsOnDates] = useState<
    AppointmentRow[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const update = <Key extends keyof typeof emptyForm>(
    key: Key,
    value: (typeof emptyForm)[Key]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const activeServices = services.filter((item) => item.is_active === 1)

  const {
    services: pickedServices,
    durationMinutes,
    totalPrice,
  } = useMemo(
    () => summarizeServices(activeServices, form.serviceIds),
    [activeServices, form.serviceIds]
  )
  const appointmentPrice = form.price === "" ? totalPrice : Number(form.price)

  const toggleService = (id: number) =>
    update(
      "serviceIds",
      form.serviceIds.includes(id)
        ? form.serviceIds.filter((item) => item !== id)
        : [...form.serviceIds, id]
    )

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

  useEffect(() => {
    if (!open || sessions.length === 0) return

    let active = true
    const from = startOfDay(sessions[0])
    const to = addDays(startOfDay(sessions[sessions.length - 1]), 1)

    listForRange(from, to)
      .then((rows) => {
        if (active) setAppointmentsOnDates(rows)
      })
      .catch(() => {
        if (active) setAppointmentsOnDates([])
      })

    return () => {
      active = false
    }
  }, [open, sessions])

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

  const endTimeLabel = useMemo(() => {
    if (!form.time) return ""
    const start = combineDateAndTime(today, form.time)
    return formatClock(addMinutes(start, durationMinutes))
  }, [form.time, durationMinutes, today])

  const timeHasConflict = (time: string) =>
    sessions.some((date) =>
      hasTimeConflict(date, time, durationMinutes, appointmentsOnDates)
    )
  const selectedTimeHasConflict = Boolean(
    form.time && timeHasConflict(form.time)
  )

  const resetForm = () => {
    setForm(createEmptyForm(today, prefill))
    setError("")
  }

  const validate = () => {
    if (!form.fullName.trim()) {
      return "نام و نام خانوادگی مشتری را وارد کنید."
    }

    if (form.phone.trim().length > 0 && !/^09\d{9}$/.test(form.phone.trim())) {
      return "شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد."
    }

    if (!Number.isSafeInteger(appointmentPrice) || appointmentPrice < 0) {
      return "قیمت نوبت باید عددی صحیح و نامنفی باشد."
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

    return ""
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const message = validate()

    if (message) {
      setError(message)
      return
    }

    const payload: NewBooking = {
      customer: {
        full_name: form.fullName.trim(),
        phone: form.phone.trim(),
        referral: form.referral.trim(),
      },
      service_ids: pickedServices.map((item) => item.id),
      therapist_id: form.therapistId ? Number(form.therapistId) : null,
      appointment: {
        status: form.status,
        notes: form.notes.trim(),
        price: appointmentPrice,
      },
      sessions: sessions.map((date): SessionRange => {
        const start = combineDateAndTime(date, form.time)
        const end = addMinutes(start, durationMinutes)

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
      changeOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ثبت نوبت با خطا مواجه شد.")
    } finally {
      setLoading(false)
    }
  }

  const changeOpen = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value)
      return
    }

    setUncontrolledOpen(value)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (loading) {
          return
        }

        changeOpen(value)

        if (!value) {
          resetForm()
        }
      }}
    >
      {isControlled ? null : (
        <DialogTrigger
          render={
            <Button>
              <CalendarDays className="size-4" />
              {trigger ?? title}
            </Button>
          }
        />
      )}

      <DialogContent
        dir="rtl"
        className="max-h-[92vh] w-[calc(100%-2rem)] translate-x-0 flex-col gap-0 overflow-y-auto p-0 sm:max-w-7xl"
      >
        <form
          onSubmit={handleSubmit}
          className="flex max-h-[92vh] min-h-0 flex-1 flex-col overflow-y-auto"
        >
          <DialogHeader className="shrink-0 flex-row items-center gap-3 p-5 text-right sm:p-6">
            <div className="flex size-11 items-center justify-center bg-primary text-primary-foreground">
              <CalendarDays className="size-5" />
            </div>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-bold sm:text-xl">
                {title}
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
                  <Field
                    label="نام و نام خانوادگی"
                    htmlFor="customer-name"
                    required
                  >
                    <CustomerSearch
                      value={form.fullName}
                      onValueChange={(value) => update("fullName", value)}
                      onSelect={(customer) => {
                        if (customer.phone.length > 0) {
                          update("phone", customer.phone)
                        }
                        update("referral", customer.referral ?? "")
                      }}
                      inputClassName={cn(inputClass, "ps-9 text-start")}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="شماره موبایل (اختیاری)"
                      htmlFor="customer-phone"
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

                    <Field label="معرفی شده توسط " htmlFor="referral">
                      <div className="relative">
                        <User className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground" />
                        <Input
                          id="referral"
                          type="text"
                          dir="rtl"
                          value={form.referral}
                          placeholder="نام معرف"
                          onChange={(event) =>
                            update("referral", event.target.value)
                          }
                          className="pr-10"
                        />
                      </div>
                    </Field>
                  </div>
                </Panel>

                <Panel
                  icon={Sparkles}
                  title="خدمت و متخصص"
                  hint={
                    pickedServices.length > 0
                      ? `${toFa(pickedServices.length)} خدمت • مجموع ${toFa(durationMinutes)} دقیقه`
                      : `انتخاب خدمت اجباری نیست؛ در نبود خدمت، مدت پیش‌فرض ${toFa(
                        DEFAULT_SESSION_MINUTES
                      )} دقیقه در نظر گرفته می‌شود.`
                  }
                >
                  <Field label="خدمات ماساژ (چند انتخابی)">
                    <ServicePicker
                      services={activeServices}
                      selectedIds={form.serviceIds}
                      onToggle={toggleService}
                      onClear={() => update("serviceIds", [])}
                    />
                  </Field>

                  <Field
                    label="قیمت دریافتی هر جلسه"
                    htmlFor="appointment-price"
                  >
                    <div className="relative">
                      <PersianNumberInput
                        id="appointment-price"
                        value={
                          form.price === "" ? String(totalPrice) : form.price
                        }
                        onValueChange={(value) => update("price", value)}
                        className={cn(inputClass, "pr-16")}
                        aria-describedby="appointment-price-hint"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                        تومان
                      </span>
                    </div>
                    <p
                      id="appointment-price-hint"
                      className="text-xs text-muted-foreground"
                    >
                      قیمت خدمات انتخاب‌شده: {toFa(totalPrice)} تومان
                    </p>
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
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </Field>
                </Panel>
              </div>

              <div className="space-y-4 lg:space-y-5">
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
                        aria-invalid={selectedTimeHasConflict}
                        className={cn(
                          "h-14 rounded-lg border-2 bg-background pr-11 pl-3 text-center text-2xl font-semibold tracking-wider tabular-nums",
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
                          <span className="text-xs opacity-80">پایان جلسه</span>
                          <span className="text-lg font-semibold tabular-nums">
                            {endTimeLabel}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs leading-6">
                          بعد از انتخاب ساعت، ساعت پایان جلسه اینجا نمایش داده
                          می‌شود.
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {QUICK_TIMES.map((time) => {
                      const active = form.time === time
                      const busy = timeHasConflict(time)
                      return (
                        <button
                          key={time}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${toFaDigits(time)}${busy ? "، تداخل با نوبت رزروشده" : ""}`}
                          title={
                            busy
                              ? "با یک نوبت زمان‌بندی‌شده تداخل دارد"
                              : undefined
                          }
                          onClick={() => update("time", time)}
                          className={cn(
                            "rounded-lg border px-3.5 py-1.5 text-sm tabular-nums transition-colors outline-none",
                            "focus-visible:ring-2 focus-visible:ring-ring",
                            busy
                              ? active
                                ? "text-destructive-foreground border-destructive bg-destructive font-medium"
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
                  {sessions.length > 0 && (
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-2 rounded-full bg-destructive" />
                      قرمز: این ساعت در یکی از روزهای انتخابی با نوبت دیگری
                      تداخل دارد.
                    </p>
                  )}
                  {selectedTimeHasConflict && (
                    <p role="alert" className="text-xs text-destructive">
                      ساعت انتخاب‌شده در یکی از روزهای انتخابی با نوبت دیگری
                      تداخل دارد.
                    </p>
                  )}
                </Panel>
                <Panel icon={Repeat} title="روزهای جلسات">
                  <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
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
                        allowPast={true}
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
                            allowPast={true}
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
                        <p className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">
                          هفته‌ای {toFa(form.weekdays.length)} جلسه (
                          {selectedWeekdayLabels}) در حدود {toFa(weeksCount)}{" "}
                          هفته
                        </p>
                      )}
                    </div>
                  )}

                  {sessions.length > 0 && (
                    <div className="space-y-2.5 rounded-lg border bg-background p-3">
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
                            {`${toFa(index + 1)}. ${form.time
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
                    className="resize-none rounded-lg bg-background"
                  />
                </Panel>
              </div>
            </div>
          </div>

          <Separator />

          <DialogFooter className="shrink-0 flex-col-reverse items-stretch gap-3 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-11 flex-1 rounded-lg px-6 sm:flex-none"
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
                    className="h-11 rounded-lg"
                  >
                    انصراف
                  </Button>
                }
              />
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}
            </div>

            {sessions.length > 0 && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-2 sm:ms-auto">
                <Wallet className="size-5 shrink-0 text-primary" />
                <div className="text-xs leading-5 text-muted-foreground">
                  <div>
                    {toFa(appointmentPrice)} تومان × {toFa(sessions.length)}{" "}
                    جلسه
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    مجموع: {toFa(appointmentPrice * sessions.length)} تومان
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
