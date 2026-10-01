"use client"

import { useCallback, useEffect, useState } from "react"
import { addDays, startOfDay } from "date-fns"
import { RefreshCw } from "lucide-react"

import { DayStrip } from "@/components/day-strip"
import { CreateBook } from "@/components/create-book"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { toFa } from "@/lib/jalali"
import { formatNumericDateTime } from "@/lib/jalali"
import { APPOINTMENT_STATUS_LABELS, weekdayName } from "@/lib/schedule"
import {
  createBooking,
  listForDay,
  listServices,
  listTherapists,
  listUpcoming,
} from "@/lib/repositories"
import type {
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
  const [upcoming, setUpcoming] = useState<AppointmentRow[]>([])
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [dayAppointments, setDayAppointments] = useState<AppointmentRow[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(() => {
    return Promise.all([listServices(), listTherapists(), listUpcoming()])
      .then(([serviceRows, therapistRows, upcomingRows]) => {
        setServices(serviceRows)
        setTherapists(therapistRows)
        setUpcoming(upcomingRows)
      })
      .catch((error) => {
        setServices([])
        setTherapists([])
        setUpcoming([])
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "خطای ناشناخته",
        })
      })
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleRefresh = async () => {
    setBusy(true)
    await refresh()
    setBusy(false)
  }

  useEffect(() => {
    if (!selectedDay) {
      return
    }

    let active = true
    const from = startOfDay(selectedDay)
    const to = addDays(from, 1)

    listForDay(from, to)
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
  }, [selectedDay, upcoming])

  const rows = selectedDay ? dayAppointments : upcoming

  const handleCreate = async (booking: NewBooking) => {
    const count = await createBooking(booking)

    setFeedback({
      kind: "success",
      text: `${toFa(count)} جلسه با موفقیت ثبت شد.`,
    })

    await refresh()
  }

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
          <span className="text-xs text-muted-foreground" dir="ltr">
            {row.phone}
          </span>
        </div>
      ),
    },
    {
      key: "service",
      header: "خدمت",
      accessor: (row) => row.service_name,
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

      <DayStrip selected={selectedDay} onSelect={(date) => setSelectedDay(date)} />

      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        initialSort={{ key: "start", dir: "asc" }}
        searchPlaceholder="جستجوی مشتری، خدمت یا متخصص..."
        emptyMessage="نوبت ثبت‌شده‌ای وجود ندارد."
        pageSize={8}
        toolbar={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void handleRefresh()}
            >
              <RefreshCw className="size-4" />
              نوسازی
            </Button>

            <CreateBook
              services={services}
              therapists={therapists}
              onCreate={handleCreate}
            />
          </>
        }
      />
    </>
  )
}
