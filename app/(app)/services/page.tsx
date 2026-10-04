"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/data-table"
import { ServiceDialog } from "@/components/service-dialog"
import { Button } from "@/components/ui/button"
import { toFa } from "@/lib/jalali"
import {
  createService,
  deleteService,
  listAllServices,
  setServiceActive,
  updateService,
} from "@/lib/repositories"
import type { Service, ServiceInput } from "@/lib/repositories"

type Feedback = { kind: "success" | "error"; text: string }

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const load = useCallback(() => {
    listAllServices()
      .then(setServices)
      .catch((error) =>
        setFeedback({
          kind: "error",
          text: error instanceof Error ? error.message : "خطای ناشناخته",
        })
      )
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (service: Service) => {
    setEditing(service)
    setDialogOpen(true)
  }

  const handleSubmit = async (input: ServiceInput) => {
    const rows = editing
      ? await updateService(editing.id, input)
      : await createService(input)

    setServices(rows)
    setFeedback({
      kind: "success",
      text: editing ? "خدمت ویرایش شد." : "خدمت اضافه شد.",
    })
    setEditing(null)
  }

  const handleToggle = async (service: Service) => {
    try {
      const rows = await setServiceActive(service.id, service.is_active !== 1)
      setServices(rows)
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود",
      })
    }
  }

  const handleDelete = async (service: Service) => {
    try {
      const rows = await deleteService(service.id)
      setServices(rows)
      setFeedback({ kind: "success", text: "خدمت حذف شد." })
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "حذف خدمت ناموفق بود",
      })
    }
  }

  const columns: DataTableColumn<Service>[] = [
    { key: "name", header: "نام خدمت", accessor: (row) => row.name },
    {
      key: "description",
      header: "توضیحات",
      accessor: (row) => row.description ?? "",
      cell: (row) =>
        row.description ? (
          <span className="text-muted-foreground">{row.description}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "duration",
      header: "مدت",
      accessor: (row) => row.duration_minutes,
      cell: (row) => <span>{toFa(row.duration_minutes)} دقیقه</span>,
    },
    {
      key: "price",
      header: "قیمت",
      accessor: (row) => row.price,
      cell: (row) => <span>{toFa(row.price)} تومان</span>,
    },
    {
      key: "status",
      header: "وضعیت",
      accessor: (row) => (row.is_active === 1 ? "فعال" : "غیرفعال"),
      cell: (row) => (
        <span
          className={
            row.is_active === 1
              ? "rounded-lg bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
              : "rounded-lg bg-muted px-2.5 py-0.5 text-xs text-muted-foreground"
          }
        >
          {row.is_active === 1 ? "فعال" : "غیرفعال"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      sortable: false,
      align: "start",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => openEdit(row)}
          >
            <Pencil className="size-3.5" />
            ویرایش
          </Button>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => void handleToggle(row)}
          >
            {row.is_active === 1 ? (
              <ToggleRight className="size-3.5" />
            ) : (
              <ToggleLeft className="size-3.5" />
            )}
            {row.is_active === 1 ? "غیرفعال" : "فعال"}
          </Button>
          <Button
            type="button"
            size="xs"
            variant="destructive"
            onClick={() => void handleDelete(row)}
          >
            <Trash2 className="size-3.5" />
            حذف
          </Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-card p-4 text-card-foreground shadow-sm">
        <div>
          <h2 className="font-semibold">سرویس‌ها</h2>
        </div>

        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          افزودن خدمت
        </Button>
      </section>

      {feedback && (
        <div
          role={feedback.kind === "error" ? "alert" : "status"}
          className={
            feedback.kind === "error"
              ? "flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              : "flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-primary"
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

      <DataTable
        columns={columns}
        data={services}
        getRowId={(row) => row.id}
        initialSort={{ key: "name", dir: "asc" }}
        searchPlaceholder="جستجوی خدمت..."
        emptyMessage="هنوز خدمتی اضافه نکرده‌اید."
        pageSize={10}
      />

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </>
  )
}
