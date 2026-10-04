"use client"

import { useCallback, useEffect, useState } from "react"
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

import { DataTable, type DataTableColumn } from "@/components/data-table"
import { TherapistDialog } from "@/components/therapist-dialog"
import { Button } from "@/components/ui/button"
import { toFa } from "@/lib/jalali"
import {
  createTherapist,
  deleteTherapist,
  listAllTherapists,
  setTherapistActive,
  updateTherapist,
} from "@/lib/repositories"
import type { Therapist, TherapistInput } from "@/lib/repositories"

type Feedback = { kind: "success" | "error"; text: string }

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState<Therapist[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Therapist | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)

  const load = useCallback(() => {
    listAllTherapists()
      .then(setTherapists)
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

  const openEdit = (therapist: Therapist) => {
    setEditing(therapist)
    setDialogOpen(true)
  }

  const handleSubmit = async (input: TherapistInput) => {
    const rows = editing
      ? await updateTherapist(editing.id, input)
      : await createTherapist(input)

    setTherapists(rows)
    setFeedback({
      kind: "success",
      text: editing ? "متخصص ویرایش شد." : "متخصص اضافه شد.",
    })
    setEditing(null)
  }

  const handleToggle = async (therapist: Therapist) => {
    try {
      const rows = await setTherapistActive(
        therapist.id,
        therapist.is_active !== 1
      )
      setTherapists(rows)
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود",
      })
    }
  }

  const handleDelete = async (therapist: Therapist) => {
    try {
      const rows = await deleteTherapist(therapist.id)
      setTherapists(rows)
      setFeedback({ kind: "success", text: "متخصص حذف شد." })
    } catch (error) {
      setFeedback({
        kind: "error",
        text: error instanceof Error ? error.message : "حذف متخصص ناموفق بود",
      })
    }
  }

  const columns: DataTableColumn<Therapist>[] = [
    { key: "name", header: "نام", accessor: (row) => row.name },
    {
      key: "specialty",
      header: "تخصص",
      accessor: (row) => row.specialty ?? "",
      cell: (row) =>
        row.specialty ? (
          <span>{row.specialty}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "phone",
      header: "شماره تماس",
      accessor: (row) => row.phone ?? "",
      cell: (row) =>
        row.phone ? (
          <span dir="ltr">{row.phone}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
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
          <h2 className="font-semibold">متخصصان ماساژ</h2>
          <p className="text-sm text-muted-foreground">
            {therapists.length === 0
              ? "هنوز متخصصی ثبت نشده است"
              : `${toFa(therapists.length)} متخصص ثبت‌شده`}
          </p>
        </div>

        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          افزودن متخصص
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
        data={therapists}
        getRowId={(row) => row.id}
        initialSort={{ key: "name", dir: "asc" }}
        searchPlaceholder="جستجوی متخصص..."
        emptyMessage="هنوز متخصصی اضافه نکرده‌اید."
        pageSize={10}
      />

      <TherapistDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={handleSubmit}
      />
    </>
  )
}
