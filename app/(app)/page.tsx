"use client"

import { useCallback, useEffect, useState } from "react"
import { addDays, isSameDay, startOfDay } from "date-fns"
import {
  CalendarDays,
  CalendarPlus,
  Check,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Eye,
  Pencil,
  RefreshCw,
  Trash2,
  Undo2,
  X,
} from "lucide-react"

import { DayStrip } from "@/components/day-strip"
import { CreateBook, type CreateBookPrefill } from "@/components/create-book"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { EditBook } from "@/components/edit-book"
import { ExportExcelButton } from "@/components/export-excel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toFa, toFaDigits } from "@/lib/jalali"
import { formatNumericDate, formatNumericDateTime } from "@/lib/jalali"
import {
  APPOINTMENT_STATUS_LABELS,
  startOfToday,
  weekdayName,
} from "@/lib/schedule"
import {
  completeDayAppointments,
  createBooking,
  deleteAppointment,
  listBookingSessions,
  listForRange,
  listServices,
  listTherapists,
  reopenDayAppointments,
  setAppointmentStatus,
  updateAppointment,
} from "@/lib/repositories"
import type {
  AppointmentEdit,
  AppointmentRow,
  NewBooking,
  Service,
  Therapist,
} from "@/lib/repositories"

type Feedback = { kind: "success" | "error"; text: string }

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-secondary/30 text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
}

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [services, setServices] = useState<Service[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfToday())
  const [dayAppointments, setDayAppointments] = useState<AppointmentRow[]>([])
  const [viewing, setViewing] = useState<AppointmentRow | null>(null)
  const [viewingSessions, setViewingSessions] = useState<AppointmentRow[]>([])
  const [viewingSessionsLoading, setViewingSessionsLoading] = useState(false)
  const [editing, setEditing] = useState<AppointmentRow | null>(null)
  const [repeatSource, setRepeatSource] = useState<AppointmentRow | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [revision, setRevision] = useState(0)

  const bumpRevision = useCallback(() => {
    setRevision((prev) => prev + 1)
  }, [])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 15_000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!feedback) return

    const timeout = window.setTimeout(() => setFeedback(null), 5000)
    return () => window.clearTimeout(timeout)
  }, [feedback])

  useEffect(() => {
    let active = true

    Promise.all([listServices(), listTherapists()])
      .then(([serviceRows, therapistRows]) => {
        if (!active) return
        setServices(serviceRows)
        setTherapists(therapistRows)
      })
      .catch((error) => {
        if (!active) return
        setServices([])
        setTherapists([])
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "خطای ناشناخته",
        })
      })

    return () => {
      active = false
    }
  }, [revision])

  useEffect(() => {
    let active = true
    const from = startOfDay(selectedDay)
    const to = addDays(from, 1)

    listForRange(from, to)
      .then((rows) => {
        if (active) {
          setDayAppointments(rows)
        }
      })
      .catch(() => {
        if (active) {
          setDayAppointments([])
        }
      })

    return () => {
      active = false
    }
  }, [selectedDay, revision])

  useEffect(() => {
    if (!viewing) return

    let active = true

    const loadSessions = async () => {
      try {
        const sessions = viewing.slug
          ? await listBookingSessions(viewing.slug)
          : [viewing]

        if (active) setViewingSessions(sessions)
      } catch {
        if (active) setViewingSessions([viewing])
      } finally {
        if (active) setViewingSessionsLoading(false)
      }
    }

    loadSessions()

    return () => {
      active = false
    }
  }, [viewing])

  const handleCreate = async (booking: NewBooking) => {
    const count = await createBooking(booking)

    setFeedback({
      kind: "success",
      text: `${toFa(count)} جلسه با موفقیت ثبت شد.`,
    })

    bumpRevision()
  }

  const handleEdit = async (id: number, input: AppointmentEdit) => {
    await updateAppointment(id, input)

    setFeedback({
      kind: "success",
      text: "نوبت با موفقیت ویرایش شد.",
    })

    setEditing(null)
    bumpRevision()
  }

  const pendingCount = dayAppointments.filter(
    (row) => row.status === "scheduled"
  ).length

  const doneCount = dayAppointments.filter(
    (row) => row.status === "completed"
  ).length

  const dayDone = pendingCount === 0 && doneCount > 0
  const completedRevenue = dayAppointments.reduce(
    (sum, row) => sum + (row.status === "completed" ? row.price : 0),
    0
  )
  const dayMetrics = [
    {
      label: "کل نوبت‌ها",
      value: toFa(dayAppointments.length),
      detail: "ثبت‌شده برای این روز",
      icon: CalendarDays,
      tone: "text-primary",
      iconTone: "bg-primary/10",
    },
    {
      label: "زمان‌بندی‌شده",
      value: toFa(pendingCount),
      detail: "در انتظار انجام",
      icon: RefreshCw,
      tone: "text-foreground",
      iconTone: "bg-muted",
    },
    {
      label: "انجام‌شده",
      value: toFa(doneCount),
      detail: "تکمیل‌شده در این روز",
      icon: CircleCheck,
      tone: "text-primary",
      iconTone: "bg-primary/10",
    },
    {
      label: "دریافتی روز",
      value: `${toFa(completedRevenue)} تومان`,
      detail: "",
      icon: CircleDollarSign,
      tone: "text-secondary-foreground",
      iconTone: "bg-secondary/30",
    },
  ]

  const isAppointmentInProgress = (row: AppointmentRow) =>
    row.status === "scheduled" &&
    currentTime >= new Date(row.start_at).getTime() &&
    currentTime < new Date(row.end_at).getTime()

  const handleToggleDayDone = async () => {
    const from = startOfDay(selectedDay)
    const to = addDays(from, 1)

    try {
      if (dayDone) {
        const count = await reopenDayAppointments(from, to)

        setFeedback({
          kind: "success",
          text: `${toFa(count)} نوبت به حالت زمان‌بندی‌شده بازگشت.`,
        })
      } else {
        const count = await completeDayAppointments(from, to)

        setFeedback({
          kind: "success",
          text: `${toFa(count)} نوبت این روز انجام‌شده علامت خورد.`,
        })
      }

      bumpRevision()
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "تغییر وضعیت روز با خطا مواجه شد.",
      })
    }
  }

  const handleToggleRowDone = async (row: AppointmentRow) => {
    const nextStatus = row.status === "completed" ? "scheduled" : "completed"

    try {
      await setAppointmentStatus(row.id, nextStatus)

      setFeedback({
        kind: "success",
        text:
          nextStatus === "completed"
            ? `نوبت ${row.full_name} انجام‌شده علامت خورد.`
            : `نوبت ${row.full_name} به حالت زمان‌بندی‌شده بازگشت.`,
      })

      bumpRevision()
    } catch (error) {
      setFeedback({
        kind: "error",
        text:
          error instanceof Error
            ? error.message
            : "تغییر وضعیت نوبت با خطا مواجه شد.",
      })
    }
  }

  const handleDeleteAppointment = async (row: AppointmentRow) => {
    const start = formatNumericDateTime(new Date(row.start_at))
    if (
      !window.confirm(
        `نوبت ${row.full_name} در ${start} حذف شود؟ فقط همین جلسه حذف می‌شود.`
      )
    ) {
      return
    }

    try {
      await deleteAppointment(row.id)
      setDayAppointments((current) =>
        current.filter((appointment) => appointment.id !== row.id)
      )
      if (viewing?.id === row.id) {
        setViewing(null)
        setViewingSessions([])
      }
      setFeedback({ kind: "success", text: "نوبت حذف شد." })
      bumpRevision()
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "حذف نوبت ناموفق بود.",
      })
    }
  }

  const repeatPrefill: CreateBookPrefill | undefined = repeatSource
    ? {
        fullName: repeatSource.full_name,
        phone: repeatSource.phone,
        serviceIds: repeatSource.service_ids,
        therapistId:
          repeatSource.therapist_id === null
            ? ""
            : String(repeatSource.therapist_id),
        notes: repeatSource.notes ?? "",
        time: (() => {
          const start = new Date(repeatSource.start_at)
          return `${String(start.getHours()).padStart(2, "0")}:${String(
            start.getMinutes()
          ).padStart(2, "0")}`
        })(),
      }
    : undefined

  const columns: DataTableColumn<AppointmentRow>[] = [
    {
      key: "start",
      header: "تاریخ و ساعت",
      accessor: (row) => new Date(row.start_at).getTime(),
      cell: (row) => {
        const start = new Date(row.start_at)
        return (
          <div className="flex flex-col">
            <span className="font-medium">{formatNumericDateTime(start)}</span>
            <span className="text-xs text-muted-foreground">
              {weekdayName(start)}
            </span>
          </div>
        )
      },
    },
    {
      key: "customer",
      header: "مشتری",
      accessor: (row) => row.full_name,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.full_name}</span>
          <span className="mt-2 text-muted-foreground">
            {row.phone.length > 0 ? toFaDigits(row.phone) : "بدون شماره"}
          </span>
        </div>
      ),
    },
    {
      key: "price",
      header: "هزینه",
      accessor: (row) => row.price,
      cell: (row) => (
        <span className="whitespace-nowrap">{toFa(row.price)} تومان</span>
      ),
    },
    {
      key: "therapist",
      header: "متخصص",
      accessor: (row) => row.therapist_name ?? "",
      cell: (row) =>
        row.therapist_name ? (
          <span>{row.therapist_name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "وضعیت",
      accessor: (row) => APPOINTMENT_STATUS_LABELS[row.status] ?? row.status,
      cell: (row) => (
        <span
          className={
            "rounded-lg px-2.5 py-0.5 text-xs " +
            (isAppointmentInProgress(row)
              ? "bg-primary text-primary-foreground"
              : (STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground"))
          }
        >
          {isAppointmentInProgress(row)
            ? "در حال انجام"
            : (APPOINTMENT_STATUS_LABELS[row.status] ?? row.status)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      sortable: false,
      align: "start",
      cell: (row) => {
        const done = row.status === "completed"
        const toggleable =
          row.status === "completed" || row.status === "scheduled"

        return (
          <div className="flex items-center gap-1">
            {toggleable && (
              <Button
                type="button"
                size="xs"
                variant={done ? "secondary" : "ghost"}
                onClick={() => handleToggleRowDone(row)}
                aria-pressed={done}
                title={
                  done
                    ? "بازگرداندن این نوبت به حالت زمان‌بندی‌شده"
                    : "علامت‌زدن این نوبت به‌عنوان انجام‌شده"
                }
              >
                {done ? (
                  <Undo2 className="size-3.5" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {done ? "بازگشت" : "انجام شد"}
              </Button>
            )}

            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => {
                setViewingSessions([])
                setViewingSessionsLoading(true)
                setViewing(row)
              }}
              aria-label={`مشاهده جزئیات نوبت ${row.full_name}`}
              title="مشاهده جزئیات نوبت"
            >
              <Eye className="size-3.5" />
              جزئیات
            </Button>

            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setRepeatSource(row)}
            >
              <CalendarPlus className="size-3.5" />
              افزودن نوبت
            </Button>

            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => setEditing(row)}
            >
              <Pencil className="size-3.5" />
              ویرایش
            </Button>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              onClick={() => void handleDeleteAppointment(row)}
              aria-label={`حذف نوبت ${row.full_name}`}
              title="حذف همین نوبت"
            >
              <Trash2 className="size-3.5 text-destructive" />
              حذف
            </Button>
          </div>
        )
      },
    },
  ]

  return (
    <>
      <div className="animate-in space-y-5 duration-500 fade-in-0">
        <section className="flex flex-col justify-between gap-4 border-b border-border/70 pb-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CalendarDays className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                {isSameDay(selectedDay, new Date())
                  ? "امروز"
                  : weekdayName(selectedDay)}
                <span className="px-1.5">·</span>
                {formatNumericDate(selectedDay)}
              </p>
              <h1 className="mt-0.5 text-xl font-bold sm:text-2xl">
                مدیریت نوبت‌ها
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={bumpRevision}
              aria-label="نوسازی نوبت‌ها"
              title="نوسازی نوبت‌ها"
            >
              <RefreshCw className="size-4" />
            </Button>
            <ExportExcelButton />
            <CreateBook
              services={services}
              therapists={therapists}
              onCreate={handleCreate}
            />
          </div>
        </section>

        <section
          aria-label="خلاصه نوبت‌های روز"
          className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-2 xl:grid-cols-4"
        >
          {dayMetrics.map((metric, index) => {
            const Icon = metric.icon

            return (
              <div
                key={metric.label}
                className={`flex min-w-0 items-center gap-3 bg-primary/10 px-3 py-2 sm:px-4 ${
                  index % 2 === 1 ? "border-s" : ""
                } ${index >= 2 ? "border-t xl:border-t-0" : ""} ${
                  index > 0 ? "sm:border-t-0 xl:border-s" : ""
                }`}
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${metric.iconTone} ${metric.tone}`}
                >
                  <Icon className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs text-muted-foreground">
                    {metric.label}
                  </p>
                  <p
                    className={`mt-0.5 flex items-center gap-2 truncate text-base font-bold tabular-nums sm:text-lg ${metric.tone}`}
                  >
                    {metric.value}
                    <p className="truncate text-[11px] text-muted-foreground">
                      {metric.detail}
                    </p>
                  </p>
                </div>
              </div>
            )
          })}
        </section>

        <DayStrip selected={selectedDay} onSelect={setSelectedDay} />

        <section className="space-y-3">
          <DataTable
            columns={columns}
            data={dayAppointments}
            getRowId={(row) => row.id}
            initialSort={{ key: "start", dir: "asc" }}
            searchPlaceholder="جستجوی مشتری، خدمت یا متخصص..."
            emptyMessage={`برای ${formatNumericDate(selectedDay)} نوبتی ثبت نشده است.`}
            pageSize={8}
            getRowClassName={(row) =>
              isAppointmentInProgress(row)
                ? "bg-primary/5 hover:bg-primary/10"
                : undefined
            }
            toolbar={
              <Button
                type="button"
                size="sm"
                variant={dayDone ? "default" : "outline"}
                onClick={handleToggleDayDone}
                disabled={dayDone ? doneCount === 0 : pendingCount === 0}
                title={
                  dayDone
                    ? "بازگرداندن نوبت‌های این روز به حالت زمان‌بندی‌شده"
                    : "علامت‌زدن همهٔ نوبت‌های این روز به‌عنوان انجام‌شده"
                }
              >
                {dayDone ? (
                  <Undo2 className="size-4" />
                ) : (
                  <Check className="size-4" />
                )}
                {dayDone ? "بازگشت به زمان‌بندی" : "پایان کار روز"}
              </Button>
            }
          />
        </section>
      </div>

      <Dialog
        open={viewing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewing(null)
            setViewingSessions([])
            setViewingSessionsLoading(false)
          }
        }}
      >
        <DialogContent dir="rtl" className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">جزئیات نوبت</DialogTitle>
          </DialogHeader>
          {viewing && (
            <dl className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["مشتری", viewing.full_name],
                  [
                    "شماره تماس",
                    viewing.phone.length > 0
                      ? toFaDigits(viewing.phone)
                      : "بدون شماره",
                  ],
                  ["شروع", formatNumericDateTime(new Date(viewing.start_at))],
                  ["پایان", formatNumericDateTime(new Date(viewing.end_at))],
                  [
                    "خدمات",
                    viewing.service_names.length > 0
                      ? viewing.service_names.join("، ")
                      : "بدون خدمت",
                  ],
                  ["متخصص", viewing.therapist_name ?? "—"],
                  [
                    "وضعیت",
                    APPOINTMENT_STATUS_LABELS[viewing.status] ?? viewing.status,
                  ],
                  [
                    "شماره جلسه",
                    viewingSessionsLoading
                      ? "در حال دریافت..."
                      : `${toFa(
                          Math.max(
                            1,
                            viewingSessions.findIndex(
                              (session) => session.id === viewing.id
                            ) + 1
                          )
                        )} از ${toFa(Math.max(1, viewingSessions.length))}`,
                  ],
                  ["هزینه", `${toFa(viewing.price)} تومان`],
                  ["معرفی از", viewing.referral || "—"],
                  ["یادداشت", viewing.notes || "—"],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-lg bg-muted p-3">
                  <dt className="text-[12px] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-[12px] font-medium wrap-break-word">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">تمام جلسات این رزرو</h3>
            {viewingSessionsLoading ? (
              <p className="text-sm text-muted-foreground">
                در حال دریافت جلسات...
              </p>
            ) : viewingSessions.length > 0 ? (
              <ol className="max-h-120 space-y-2 overflow-y-auto">
                {viewingSessions.map((session, index) => (
                  <li
                    key={session.id}
                    className={
                      "flex items-center justify-between gap-3 rounded-lg border p-3 text-sm " +
                      (session.id === viewing?.id
                        ? "border-primary/40 bg-primary/5"
                        : "")
                    }
                  >
                    <div className="min-w-0">
                      <p className="font-medium">
                        جلسه {toFa(index + 1)}:{" "}
                        {session.service_names.join("، ") || "بدون خدمت"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumericDateTime(new Date(session.start_at))} تا{" "}
                        {formatNumericDateTime(new Date(session.end_at))}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {APPOINTMENT_STATUS_LABELS[session.status] ??
                        session.status}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">
                جلسه‌ای برای این رزرو پیدا نشد.
              </p>
            )}
          </section>
        </DialogContent>
      </Dialog>

      {feedback && (
        <div className="pointer-events-none fixed inset-x-4 bottom-4 z-100 flex justify-center sm:inset-x-auto sm:inset-e-6 sm:w-full sm:max-w-md">
          <div
            role="status"
            aria-live={feedback.kind === "error" ? "assertive" : "polite"}
            className={`pointer-events-auto flex w-full animate-in items-start gap-3 rounded-lg border p-4 text-sm shadow-lg fade-in slide-in-from-bottom-2 ${
              feedback.kind === "error"
                ? "border-destructive/30 bg-card text-destructive"
                : "border-primary/30 bg-card text-foreground"
            }`}
          >
            {feedback.kind === "error" ? (
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
            ) : (
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            )}
            <p className="min-w-0 flex-1 leading-6">{feedback.text}</p>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="بستن پیام"
              onClick={() => setFeedback(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateBook
        key={repeatSource?.id ?? "no-repeat"}
        services={services}
        therapists={therapists}
        onCreate={handleCreate}
        prefill={repeatPrefill}
        open={repeatSource !== null}
        onOpenChange={(value) => {
          if (!value) {
            setRepeatSource(null)
          }
        }}
        title="افزودن نوبت جدید"
      />

      <EditBook
        key={editing?.id ?? "no-edit"}
        appointment={editing}
        open={editing !== null}
        onOpenChange={(value) => {
          if (!value) {
            setEditing(null)
          }
        }}
        services={services}
        therapists={therapists}
        onSave={handleEdit}
      />
    </>
  )
}
