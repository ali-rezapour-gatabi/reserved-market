"use client"

import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { toEnDigits, toFaDigits } from "@/lib/jalali"

type PersianNumberInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "type" | "inputMode" | "dir"
> & {
  value: string
  onValueChange: (value: string) => void
}

export function PersianNumberInput({
  value,
  onValueChange,
  className,
  ...props
}: PersianNumberInputProps) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={toFaDigits(value)}
      onChange={(event) => onValueChange(toEnDigits(event.target.value))}
      className={cn("text-left tabular-nums", className)}
    />
  )
}
