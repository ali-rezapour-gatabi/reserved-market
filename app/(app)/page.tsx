"use client"

import { useCallback, useEffect, useState } from "react"
import { addDays, startOfDay } from "date-fns"
import { CalendarPlus, Check, Pencil, RefreshCw, Undo2 } from "lucide-react"

import { DayStrip } from "@/components/day-strip"
import { CreateBook, type CreateBookPrefill } from "@/components/create-book"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { EditBook } from "@/components/edit-book"
import { ExportExcelButton } from "@/components/export-excel"
import { Button } from "@/components/ui/button"
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
  const [services, setServices] = useState<Service[]>([])
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfToday())
  const [dayAppointments, setDayAppointments] = useState<AppointmentRow[]>([])
  const [editing, setEditing] = useState<AppointmentRow | null>(null)
  const [repeatSource, setRepeatSource] = useState<AppointmentRow | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [revision, setRevision] = useState(0)

  const bumpRevision = useCallback(() => {
    setRevision((prev) => prev + 1)
  }, [])

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
          error instanceof Error ? error.message : "تغییر وضعیت نوبت با خطا مواجه شد.",
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
      key: "service",
      header: "خدمت",
      accessor: (row) => row.service_names.join("، "),
      cell: (row) =>
        row.service_names.length > 0 ? (
          <span>{row.service_names.join("، ")}</span>
        ) : (
          <span className="text-muted-foreground">بدون خدمت</span>
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
            "rounded-full px-2.5 py-0.5 text-xs " +
            (STATUS_STYLES[row.status] ?? "bg-muted text-muted-foreground")
          }
        >
          {APPOINTMENT_STATUS_LABELS[row.status] ?? row.status}
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
          </div>
        )
      },
    },
  ]

  return (
    <>
      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={
            feedback.kind === "error"
              ? "flex items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              : "flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
          }
        >
          <span>{feedback.text}</span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => setFeedback(null)}
          >
            بستن
          </Button>
        </div>
      )}

      <DayStrip selected={selectedDay} onSelect={setSelectedDay} />

      <DataTable
        columns={columns}
        data={dayAppointments}
        getRowId={(row) => row.id}
        initialSort={{ key: "start", dir: "asc" }}
        searchPlaceholder="جستجوی مشتری، خدمت یا متخصص..."
        emptyMessage={`برای ${formatNumericDate(selectedDay)} نوبتی ثبت نشده است.`}
        pageSize={8}
        toolbar={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={bumpRevision}
            >
              <RefreshCw className="size-4" />
              نوسازی
            </Button>

            <ExportExcelButton />

            <Button
              type="button"
              size="sm"
              variant={dayDone ? "secondary" : "outline"}
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

            <CreateBook
              services={services}
              therapists={therapists}
              onCreate={handleCreate}
            />
          </>
        }
      />

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
