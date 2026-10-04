"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PersianNumberInput } from "@/components/persian-number-input"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import type { Therapist, TherapistInput } from "@/lib/repositories"

type TherapistDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Therapist | null
  onSubmit: (input: TherapistInput) => Promise<void>
}

const empty = {
  name: "",
  specialty: "",
  phone: "",
  description: "",
}

export function TherapistDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: TherapistDialogProps) {
  const [form, setForm] = useState(empty)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setError("")
    setForm(
      initial
        ? {
            name: initial.name,
            specialty: initial.specialty ?? "",
            phone: initial.phone ?? "",
            description: initial.description ?? "",
          }
        : empty
    )
  }, [open, initial])

  const update = <Key extends keyof typeof empty>(
    key: Key,
    value: (typeof empty)[Key]
  ) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!form.name.trim()) {
      setError("نام متخصص را وارد کنید.")
      return
    }

    if (form.phone.trim() && !/^09\d{9}$/.test(form.phone.trim())) {
      setError("شماره موبایل باید با ۰۹ شروع شده و ۱۱ رقم باشد.")
      return
    }

    try {
      setLoading(true)
      setError("")
      await onSubmit({
        name: form.name.trim(),
        specialty: form.specialty.trim(),
        phone: form.phone.trim(),
        description: form.description.trim(),
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره متخصص ناموفق بود.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {initial ? "ویرایش متخصص" : "افزودن متخصص ماساژ"}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="therapist-name">
                نام و نام خانوادگی<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="therapist-name"
                placeholder="نام متخصص"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                maxLength={150}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapist-specialty">تخصص</Label>
              <Input
                id="therapist-specialty"
                placeholder="مثلاً ماساژ ورزشی"
                value={form.specialty}
                onChange={(event) => update("specialty", event.target.value)}
                maxLength={150}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapist-phone">شماره تماس</Label>
              <PersianNumberInput
                id="therapist-phone"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                value={form.phone}
                onValueChange={(value) => update("phone", value)}
                maxLength={11}
                className="text-[15px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapist-description">توضیحات</Label>
              <Textarea
                id="therapist-description"
                placeholder="سوابق، گواهینامه‌ها یا توضیحات..."
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={2}
                maxLength={300}
              />
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

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              {loading ? "در حال ذخیره..." : "ذخیره"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => onOpenChange(false)}
            >
              انصراف
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
