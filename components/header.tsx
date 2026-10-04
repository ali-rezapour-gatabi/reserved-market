"use client"

import React from "react"
import { formatNumericDate } from "@/lib/jalali"
import { weekdayName } from "@/lib/schedule"

const Header: React.FC = () => {
  const now = new Date()
  const persianDate = `${weekdayName(now)} ${formatNumericDate(now)}`

  return (
    <header className="sticky top-0 flex w-full items-center justify-between rounded-lg bg-secondary p-4 pt-5">
      <h1 className="text-xl font-bold">اطلس ماساژ</h1>
      <h3 className="text-xl font-bold" dir="rtl">
        {persianDate}
      </h3>
    </header>
  )
}

export default Header
