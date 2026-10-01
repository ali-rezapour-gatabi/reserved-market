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
import type { Service, ServiceInput } from "@/lib/repositories"

type ServiceDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: Service | null
  onSubmit: (input: ServiceInput) => Promise<void>
}

const empty = {
  name: "",
  description: "",
  durationMinutes: "",
  price: "",
}

export function ServiceDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
}: ServiceDialogProps) {
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
            description: initial.description ?? "",
            durationMinutes: String(initial.duration_minutes),
            price: String(initial.price),
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

    const duration = Number(form.durationMinutes)
    const price = Number(form.price)

    if (!form.name.trim()) {
      setError("نام خدمت را وارد کنید.")
      return
    }

    if (!Number.isFinite(duration) || duration < 1) {
      setError("مدت زمان باید عددی بزرگ‌تر از صفر باشد.")
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("قیمت باید عددی غیرمنفی باشد.")
      return
    }

    try {
      setLoading(true)
      setError("")
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        duration_minutes: duration,
        price,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "ذخیره خدمت ناموفق بود.")
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
              {initial ? "ویرایش خدمت" : "افزودن خدمت جدید"}
            </DialogTitle>
          </DialogHeader>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="service-name">
                نام خدمت<span className="text-destructive"> *</span>
              </Label>
              <Input
                id="service-name"
                placeholder="مثلاً ماساژ سوئیسی"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                maxLength={150}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-description">توضیحات</Label>
              <Textarea
                id="service-description"
                placeholder="توضیح کوتاه درباره این خدمت..."
                value={form.description}
                onChange={(event) => update("description", event.target.value)}
                rows={2}
                maxLength={300}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="service-duration">
                  مدت زمان (دقیقه)<span className="text-destructive"> *</span>
                </Label>
                <PersianNumberInput
                  id="service-duration"
                  min={1}
                  value={form.durationMinutes}
                  onValueChange={(value) => update("durationMinutes", value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="service-price">
                  قیمت (تومان)<span className="text-destructive"> *</span>
                </Label>
                <PersianNumberInput
                  id="service-price"
                  value={form.price}
                  onValueChange={(value) => update("price", value)}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} className="flex-1">
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
