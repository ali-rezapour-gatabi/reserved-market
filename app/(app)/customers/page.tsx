"use client"

import { useEffect, useRef, useState } from "react"
import { Check, Eye, Pencil, RefreshCw, Trash2, X } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianNumberInput } from "@/components/persian-number-input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatNumericDateTime, toFa, toFaDigits } from "@/lib/jalali"
import { APPOINTMENT_STATUS_LABELS } from "@/lib/schedule"
import {
  deleteAppointment,
  listAllCustomers,
  listCustomerAppointments,
  updateCustomer,
} from "@/lib/repositories"
import type { AppointmentRow, CustomerListRow } from "@/lib/repositories"

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-primary/10 text-primary",
  completed: "bg-secondary/30 text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-muted text-muted-foreground",
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerListRow | null>(null)
  const [sessions, setSessions] = useState<AppointmentRow[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [sessionsError, setSessionsError] = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(
    null
  )
  const [editingCustomer, setEditingCustomer] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [customerError, setCustomerError] = useState("")
  const [savingCustomer, setSavingCustomer] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    let active = true

    listAllCustomers()
      .then((rows) => {
        if (active) {
          setCustomers(rows)
          setLoadError(null)
        }
      })
      .catch((error) => {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "بارگیری مشتریان ناموفق بود."
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const openDetails = (customer: CustomerListRow) => {
    const currentRequest = ++requestId.current
    setSelectedCustomer(customer)
    setEditingCustomer(false)
    setCustomerError("")
    setSessions([])
    setSessionsError(null)
    setSessionsLoading(true)

    listCustomerAppointments(customer.id)
      .then((rows) => {
        if (currentRequest === requestId.current) setSessions(rows)
      })
      .catch((error) => {
        if (currentRequest === requestId.current) {
          setSessionsError(
            error instanceof Error ? error.message : "بارگیری سوابق ناموفق بود."
          )
        }
      })
      .finally(() => {
        if (currentRequest === requestId.current) setSessionsLoading(false)
      })
  }

  const closeDetails = (open: boolean) => {
    if (!open) {
      requestId.current++
      setSelectedCustomer(null)
      setEditingCustomer(false)
      setCustomerError("")
      setSessions([])
      setSessionsError(null)
      setSessionsLoading(false)
    }
  }

  const startEditingCustomer = () => {
    if (!selectedCustomer) return
    setCustomerName(selectedCustomer.full_name)
    setCustomerPhone(selectedCustomer.phone)
    setCustomerError("")
    setEditingCustomer(true)
  }

  const handleUpdateCustomer = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault()
    if (!selectedCustomer) return

    setSavingCustomer(true)
    setCustomerError("")
    try {
      const rows = await updateCustomer(selectedCustomer.id, {
        full_name: customerName,
        phone: customerPhone,
      })
      const updated = rows.find((row) => row.id === selectedCustomer.id)
      if (updated) {
        setSelectedCustomer(updated)
        setCustomers(rows)
      }
      setEditingCustomer(false)
    } catch (error) {
      setCustomerError(
        error instanceof Error ? error.message : "ویرایش مشتری ناموفق بود."
      )
    } finally {
      setSavingCustomer(false)
    }
  }

  const refreshCustomers = async () => {
    setLoading(true)
    try {
      setCustomers(await listAllCustomers())
      setLoadError(null)
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "بارگیری مشتریان ناموفق بود."
      )
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSession = async (session: AppointmentRow) => {
    if (
      !window.confirm(
        `جلسه ${formatNumericDateTime(new Date(session.start_at))} حذف شود؟ فقط همین جلسه حذف می‌شود.`
      )
    ) {
      return
    }

    setDeletingSessionId(session.id)
    try {
      await deleteAppointment(session.id)
      setSessions((current) =>
        current.filter((appointment) => appointment.id !== session.id)
      )
      setCustomers(await listAllCustomers())
    } catch (error) {
      setSessionsError(
        error instanceof Error ? error.message : "حذف نوبت ناموفق بود."
      )
    } finally {
      setDeletingSessionId(null)
    }
  }

  const columns: DataTableColumn<CustomerListRow>[] = [
    {
      key: "full_name",
      header: "نام مشتری",
      accessor: (row) => row.full_name,
      cell: (row) => (
        <span className="inline-flex items-center gap-2 font-medium">
          <Eye className="size-4 text-primary" />
          {row.full_name}
        </span>
      ),
    },
    {
      key: "phone",
      header: "شماره تماس",
      accessor: (row) => row.phone,
      cell: (row) =>
        row.phone ? (
          <span dir="ltr" className="inline-block">
            {toFaDigits(row.phone)}
          </span>
        ) : (
          <span className="text-muted-foreground">بدون شماره</span>
        ),
    },
    {
      key: "total_sessions",
      header: "کل جلسات",
      accessor: (row) => row.total_sessions,
      cell: (row) => toFa(row.total_sessions),
    },
    {
      key: "completed_sessions",
      header: "جلسات انجام‌شده",
      accessor: (row) => row.completed_sessions,
      cell: (row) => toFa(row.completed_sessions),
    },
    {
      key: "last_session_at",
      header: "آخرین نوبت",
      accessor: (row) => row.last_session_at ?? "",
      cell: (row) =>
        row.last_session_at ? (
          formatNumericDateTime(new Date(row.last_session_at))
        ) : (
          <span className="text-muted-foreground">بدون نوبت</span>
        ),
    },
  ]

  const completedSessions = sessions.filter(
    (session) => session.status === "completed"
  ).length
  const scheduledSessions = sessions.filter(
    (session) => session.status === "scheduled"
  ).length

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4 text-card-foreground shadow-sm">
        <div>
          <h2 className="font-semibold">مشتریان</h2>
          <p className="text-sm text-muted-foreground">
            {toFa(customers.length)} مشتری ثبت‌شده
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void refreshCustomers()}
          disabled={loading}
        >
          <RefreshCw className="size-4" />
          نوسازی
        </Button>
      </section>

      {loadError && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
        >
          {loadError}
        </p>
      )}

      <DataTable
        columns={columns}
        data={customers}
        getRowId={(row) => row.id}
        initialSort={{ key: "full_name", dir: "asc" }}
        searchPlaceholder="جستجوی نام یا شماره تماس مشتری..."
        emptyMessage={
          loading
            ? "در حال بارگیری مشتریان..."
            : "مشتری‌ای برای نمایش وجود ندارد."
        }
        pageSize={10}
        onRowClick={openDetails}
      />

      <Dialog open={selectedCustomer !== null} onOpenChange={closeDetails}>
        <DialogContent
          dir="rtl"
          className="max-h-[85vh] overflow-y-auto sm:max-w-3xl"
        >
          {selectedCustomer && (
            <>
              <DialogHeader className="flex-row items-center justify-between gap-3">
                <DialogTitle className="text-lg font-bold">
                  {editingCustomer
                    ? "ویرایش اطلاعات مشتری"
                    : selectedCustomer.full_name}
                </DialogTitle>
                {!editingCustomer && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-10"
                    onClick={startEditingCustomer}
                  >
                    <Pencil className="size-4" />
                    ویرایش
                  </Button>
                )}
              </DialogHeader>

              {editingCustomer ? (
                <form
                  onSubmit={handleUpdateCustomer}
                  className="grid gap-4 border-b pb-4 sm:grid-cols-2"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-name">نام مشتری</Label>
                    <Input
                      id="edit-customer-name"
                      value={customerName}
                      onChange={(event) => setCustomerName(event.target.value)}
                      required
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-customer-phone">شماره موبایل</Label>
                    <PersianNumberInput
                      id="edit-customer-phone"
                      value={customerPhone}
                      onValueChange={setCustomerPhone}
                      maxLength={11}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    />
                  </div>
                  {customerError && (
                    <p
                      role="alert"
                      className="text-sm text-destructive sm:col-span-2"
                    >
                      {customerError}
                    </p>
                  )}
                  <div className="flex gap-2 sm:col-span-2">
                    <Button type="submit" size="sm" disabled={savingCustomer}>
                      <Check className="size-4" />
                      {savingCustomer ? "در حال ذخیره..." : "ذخیره"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingCustomer}
                      onClick={() => {
                        setEditingCustomer(false)
                        setCustomerError("")
                      }}
                    >
                      <X className="size-4" />
                      انصراف
                    </Button>
                  </div>
                </form>
              ) : (
                <dl className="grid gap-4 border-b pb-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">
                      شماره تماس
                    </dt>
                    <dd className="mt-1 font-medium">
                      {selectedCustomer.phone
                        ? toFaDigits(selectedCustomer.phone)
                        : "بدون شماره"}
                    </dd>
                  </div>
                </dl>
              )}

              <div className="flex w-full flex-wrap justify-between gap-x-6 gap-y-2 border-b pb-4 text-sm">
                <p>
                  کل جلسات: <strong>{toFa(sessions.length)}</strong>
                </p>
                <p>
                  انجام‌شده: <strong>{toFa(completedSessions)}</strong>
                </p>
                <p>
                  زمان‌بندی‌شده: <strong>{toFa(scheduledSessions)}</strong>
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="font-semibold">سوابق نوبت‌ها</h3>
                {sessionsLoading ? (
                  <p className="text-sm text-muted-foreground">
                    در حال بارگیری سوابق...
                  </p>
                ) : sessionsError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {sessionsError}
                  </p>
                ) : sessions.length > 0 ? (
                  <ol className="space-y-2">
                    {sessions.map((session, index) => (
                      <li
                        key={session.id}
                        className="grid gap-2 border-b pb-3 text-sm last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      >
                        <div className="min-w-0 space-y-1">
                          <p className="font-medium">
                            جلسه {toFa(index + 1)} ·{" "}
                            {formatNumericDateTime(new Date(session.start_at))}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            پایان:{" "}
                            {formatNumericDateTime(new Date(session.end_at))}
                            <span className="px-1">·</span>
                            {session.service_names.join("، ") || "بدون خدمت"}
                            {session.therapist_name
                              ? ` · ${session.therapist_name}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span
                            className={`rounded-lg px-2.5 py-0.5 text-xs ${STATUS_STYLES[session.status] ?? "bg-muted text-muted-foreground"}`}
                          >
                            {APPOINTMENT_STATUS_LABELS[session.status] ??
                              session.status}
                          </span>
                          <span className="text-xs whitespace-nowrap">
                            {toFa(session.price)} تومان
                          </span>
                          <Button
                            type="button"
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => void handleDeleteSession(session)}
                            disabled={deletingSessionId === session.id}
                            aria-label={`حذف جلسه ${toFa(index + 1)}`}
                            title="حذف همین جلسه"
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    هنوز نوبتی برای این مشتری ثبت نشده است.
                  </p>
                )}
              </section>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
