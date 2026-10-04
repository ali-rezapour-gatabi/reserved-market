"use client"

import * as React from "react"
import { UserPlus } from "lucide-react"

import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxStatus,
} from "@/components/ui/combobox"
import { InputGroupAddon } from "@/components/ui/input-group"
import { listCustomers, searchCustomers } from "@/lib/repositories"
import type { Customer } from "@/lib/repositories"
import { toFa, toFaDigits } from "@/lib/jalali"
import { cn } from "@/lib/utils"

export type CustomerOption = Customer & { isNew?: boolean }

type CustomerSearchProps = {
  value: string
  onValueChange: (value: string) => void
  onSelect: (customer: CustomerOption) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

const NEW_CUSTOMER_ID = 0

export function CustomerSearch({
  value,
  onValueChange,
  onSelect,
  placeholder = "نام مراجعه‌کننده",
  className,
  inputClassName,
}: CustomerSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [rows, setRows] = React.useState<CustomerOption[]>([])
  const [loading, setLoading] = React.useState(false)

  const trimmed = value.trim()
  const hasQuery = trimmed.length > 0

  React.useEffect(() => {
    if (!open) {
      return
    }

    let active = true
    let started = false

    const timer = setTimeout(
      () => {
        started = true
        setLoading(true)

        const request = hasQuery ? searchCustomers(trimmed) : listCustomers()

        request
          .then((found) => {
            if (active) {
              setRows(found)
            }
          })
          .catch(() => {
            if (active) {
              setRows([])
            }
          })
          .finally(() => {
            if (active) {
              setLoading(false)
            }
          })
      },
      hasQuery ? 200 : 0
    )

    return () => {
      active = false
      clearTimeout(timer)

      if (started) {
        setLoading(false)
      }
    }
  }, [open, hasQuery, trimmed])

  const options = React.useMemo<CustomerOption[]>(() => {
    if (!hasQuery) {
      return rows
    }

    const exists = rows.some((item) => item.full_name.trim() === trimmed)

    if (exists) {
      return rows
    }

    return [
      {
        id: NEW_CUSTOMER_ID,
        full_name: trimmed,
        phone: "",
        notes: null,
        updated_at: "",
        isNew: true,
      },
      ...rows,
    ]
  }, [rows, hasQuery, trimmed])

  const selected = React.useMemo<CustomerOption | null>(() => {
    if (!hasQuery) {
      return null
    }

    const match = options.find((item) => item.full_name.trim() === trimmed)

    if (match) {
      return match
    }

    return {
      id: NEW_CUSTOMER_ID,
      full_name: trimmed,
      phone: "",
      notes: null,
      updated_at: "",
      isNew: true,
    }
  }, [options, hasQuery, trimmed])

  return (
    <Combobox
      items={options}
      filter={null}
      value={selected}
      onValueChange={(next: CustomerOption | null) => {
        if (!next) {
          return
        }

        onValueChange(next.full_name)
        onSelect(next)
      }}
      inputValue={value}
      onInputValueChange={(next) => {
        onValueChange(next)
        setOpen(true)
      }}
      itemToStringLabel={(item: CustomerOption) => item.full_name}
      open={open}
      onOpenChange={setOpen}
    >
      <ComboboxInput
        id="customer-name"
        placeholder={placeholder}
        maxLength={150}
        autoComplete="off"
        className={cn("h-12 w-full", className)}
        inputClassName={cn("text-start", inputClassName)}
        onFocus={() => setOpen(true)}
      >
        <InputGroupAddon>
          <UserPlus />
        </InputGroupAddon>
      </ComboboxInput>

      <ComboboxContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="rounded-lg"
      >
        <ComboboxList>
          {(option: CustomerOption) => (
            <ComboboxItem
              key={`${option.id}-${option.full_name}`}
              value={option}
              className="items-start rounded-lg"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[12px]">
                  {option.isNew
                    ? `ثبت «${option.full_name}» به‌عنوان مشتری جدید`
                    : option.full_name}
                </span>
                <span className="mt-2 text-[10px] font-normal text-primary">
                  {option.isNew
                    ? "با ثبت نوبت، این مشتری ساخته می‌شود"
                    : option.phone.length > 0
                      ? toFaDigits(option.phone)
                      : "بدون شماره تماس"}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>

        {!loading && options.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            {hasQuery
              ? "هنوز مشتری‌ای ثبت نشده است؛ نام واردشده با ثبت نوبت ساخته می‌شود."
              : "هنوز مشتری‌ای ثبت نشده است."}
          </p>
        )}

        <ComboboxStatus>
          {loading ? "در حال جستجوی مشتری..." : `${toFa(options.length)} مشتری`}
        </ComboboxStatus>
      </ComboboxContent>
    </Combobox>
  )
}
