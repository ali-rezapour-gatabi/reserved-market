import {
  jalaaliMonthLength,
  jalaaliToDateObject,
  toJalaali,
} from "jalaali-js"

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
]

const numberFormat = new Intl.NumberFormat("fa-IR-u-nu-arabext")

const timeFormat = new Intl.DateTimeFormat("fa-IR-u-nu-arabext", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

function padFa(value: number, length = 2) {
  return String(value)
    .padStart(length, "0")
    .replace(/\d/g, (digit) => FA_DIGITS[Number(digit)])
}

export function toFaDigits(value: string) {
  return value
    .replace(/\d/g, (digit) => FA_DIGITS[Number(digit)])
    .replace(/[٠-٩]/g, (digit) => FA_DIGITS[digit.charCodeAt(0) - 1632])
    .replace(/[۰-۹]/g, (digit) => FA_DIGITS[digit.charCodeAt(0) - 1776])
}

export function toEnDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 1632))
}

export function toFa(value: number) {
  return toFaDigits(numberFormat.format(value))
}

export function jalaliParts(date: Date) {
  return toJalaali(date)
}

export function fromJalali(jy: number, jm: number, jd: number) {
  return jalaaliToDateObject(jy, jm, jd)
}

export function daysInJalaliMonth(jy: number, jm: number) {
  return jalaaliMonthLength(jy, jm)
}

export function jalaliMonthGrid(jy: number, jm: number) {
  const firstDay = fromJalali(jy, jm, 1)
  const offset = (firstDay.getDay() + 1) % 7
  const days = daysInJalaliMonth(jy, jm)

  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from(
      { length: days },
      (_, index) => fromJalali(jy, jm, index + 1)
    ),
  ]
}

export function shiftJalaliMonth(jy: number, jm: number, delta: number) {
  const total = jy * 12 + jm - 1 + delta
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 }
}

export function formatDate(date: Date) {
  const { jy, jm, jd } = jalaliParts(date)
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`
}

export function formatNumericDate(date: Date) {
  const { jy, jm, jd } = jalaliParts(date)
  return `${padFa(jy, 4)}/${padFa(jm)}/${padFa(jd)}`
}

export function formatNumericMonth(jy: number, jm: number) {
  return `${padFa(jy, 4)}/${padFa(jm)}`
}

export function formatMonthYear(jy: number, jm: number) {
  return `${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`
}

export function formatTime(date: Date) {
  return toFaDigits(timeFormat.format(date))
}

export function formatDateTime(date: Date) {
  return `${formatDate(date)} — ${formatTime(date)}`
}

export function formatNumericDateTime(date: Date) {
  return `${formatNumericDate(date)} — ${formatTime(date)}`
}
