"use client"

import * as React from "react"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toFa } from "@/lib/jalali"

export type SortDir = "asc" | "desc"

export type DataTableColumn<TData> = {
  key: string
  header: React.ReactNode
  accessor?: (row: TData) => string | number | null | undefined
  cell?: (row: TData) => React.ReactNode
  sortable?: boolean
  align?: "start" | "center" | "end"
  className?: string
  headerClassName?: string
}

type DataTableProps<TData> = {
  columns: DataTableColumn<TData>[]
  data: TData[]
  getRowId: (row: TData, index: number) => string | number
  initialSort?: { key: string; dir: SortDir }
  searchPlaceholder?: string
  emptyMessage?: string
  pageSize?: number
  enableSearch?: boolean
  toolbar?: React.ReactNode
}

function alignClass(align?: "start" | "center" | "end") {
  if (align === "center") return "text-center"
  if (align === "end") return "text-end"
  return "text-start"
}

function compareValues(
  a: string | number | null | undefined,
  b: string | number | null | undefined
) {
  if (a == null && b == null) return 0
  if (a == null) return -1
  if (b == null) return 1

  if (typeof a === "number" && typeof b === "number") {
    return a - b
  }

  return String(a).localeCompare(String(b), "fa")
}

export function DataTable<TData>({
  columns,
  data,
  getRowId,
  initialSort,
  searchPlaceholder = "جستجو...",
  emptyMessage = "موردی برای نمایش وجود ندارد.",
  pageSize = 10,
  enableSearch = true,
  toolbar,
}: DataTableProps<TData>) {
  const [sortKey, setSortKey] = React.useState<string | null>(
    initialSort?.key ?? null
  )
  const [sortDir, setSortDir] = React.useState<SortDir>(
    initialSort?.dir ?? "asc"
  )
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(0)

  const columnMap = React.useMemo(() => {
    const map = new Map<string, DataTableColumn<TData>>()
    for (const column of columns) {
      map.set(column.key, column)
    }
    return map
  }, [columns])

  const searched = React.useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return data
    }

    return data.filter((row) =>
      columns.some((column) => {
        if (!column.accessor) return false
        const value = column.accessor(row)
        return String(value ?? "").toLowerCase().includes(needle)
      })
    )
  }, [data, columns, query])

  const sorted = React.useMemo(() => {
    if (!sortKey) return searched

    const column = columnMap.get(sortKey)

    if (!column?.accessor) return searched

    const accessor = column.accessor
    const factor = sortDir === "asc" ? 1 : -1

    return [...searched].sort(
      (rowA, rowB) => compareValues(accessor(rowA), accessor(rowB)) * factor
    )
  }, [searched, sortKey, sortDir, columnMap])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const start = safePage * pageSize
  const paged = sorted.slice(start, start + pageSize)

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }

    setSortKey(key)
    setSortDir("asc")
  }

  React.useEffect(() => {
    setPage(0)
  }, [query, sortKey, sortDir, data.length])

  return (
    <div className="space-y-4">
      {(enableSearch || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {enableSearch && (
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              dir="rtl"
              className="h-11 w-full max-w-xs rounded-lg border border-transparent bg-input/50 px-3 text-sm outline-none transition-[color,box-shadow,background-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
            />
          )}
          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      <div className="rounded-2xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => {
                const sortable = column.sortable !== false && column.accessor

                return (
                  <TableHead
                    key={column.key}
                    className={cn(alignClass(column.align), column.headerClassName)}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {column.header}
                        {sortKey === column.key && sortDir === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : sortKey === column.key && sortDir === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row, index) => (
                <TableRow key={getRowId(row, start + index)}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn(alignClass(column.align), column.className)}
                    >
                      {column.cell
                        ? column.cell(row)
                        : String(column.accessor?.(row) ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          نمایش {toFa(paged.length)} از {toFa(sorted.length)} ردیف
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              صفحه {toFa(safePage + 1)} از {toFa(totalPages)}
            </span>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={safePage === 0}
              aria-label="صفحه قبل"
            >
              <ChevronRight className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="صفحه بعد"
            >
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
