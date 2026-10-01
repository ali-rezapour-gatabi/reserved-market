import { addDays, startOfDay } from "date-fns"
import { formatNumericDate } from "@/lib/jalali"

export const WEEKDAY_NAMES = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
]

export const WEEKDAY_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"]

export const WEEKDAY_ORDER = [6, 0, 1, 2, 3, 4, 5]

export const MAX_SESSIONS = 60

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "زمان‌بندی شده",
  completed: "انجام شده",
  cancelled: "لغو شده",
  no_show: "حاضر نشد",
}

export function weekdayName(date: Date) {
  return WEEKDAY_NAMES[date.getDay()]
}

export function formatSession(date: Date) {
  return `${weekdayName(date)} ${formatNumericDate(date)}`
}

export function startOfToday() {
  return startOfDay(new Date())
}

export function isPast(date: Date) {
  return date.getTime() < startOfToday().getTime()
}

export function sortDates(dates: Date[]) {
  return [...dates].sort((a, b) => a.getTime() - b.getTime())
}

export function uniqueDates(dates: Date[]) {
  const seen = new Map<number, Date>()

  for (const date of dates) {
    const day = startOfDay(date)
    seen.set(day.getTime(), day)
  }

  return sortDates([...seen.values()])
}

export function toggleDate(dates: Date[], date: Date) {
  const day = startOfDay(date)
  const exists = dates.some(
    (item) => startOfDay(item).getTime() === day.getTime()
  )

  if (exists) {
    return dates
      .filter((item) => startOfDay(item).getTime() !== day.getTime())
      .map((item) => startOfDay(item))
  }

  return sortDates([...dates.map((item) => startOfDay(item)), day])
}

export function sortWeekdays(weekdays: number[]) {
  return WEEKDAY_ORDER.filter((day) => weekdays.includes(day))
}

export function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const result = new Date(date)
  result.setHours(hours || 0, minutes || 0, 0, 0)
  return result
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

export function generateWeeklySessions(
  startDate: Date | null | undefined,
  weekdays: number[],
  total: number
) {
  if (!startDate || weekdays.length === 0 || total < 1) {
    return []
  }

  const sessions: Date[] = []
  const limit = 365 + total * 7
  let cursor = startOfDay(startDate)

  for (let index = 0; index < limit && sessions.length < total; index++) {
    if (weekdays.includes(cursor.getDay())) {
      sessions.push(cursor)
    }

    cursor = addDays(cursor, 1)
  }

  return sessions
}
