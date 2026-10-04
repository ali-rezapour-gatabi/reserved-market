"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarClock, ContactRound, Sparkles, Users } from "lucide-react"

import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  {
    href: "/",
    label: "داشبورد",
    icon: CalendarClock,
  },
  {
    href: "/services",
    label: "سرویس‌ها",
    icon: Sparkles,
  },
  {
    href: "/customers",
    label: "مشتریان",
    icon: ContactRound,
  },
  {
    href: "/therapists",
    label: "متخصص‌ها",
    icon: Users,
  },
]

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col gap-2 rounded-lg bg-card p-3 text-card-foreground shadow-sm lg:w-64",
        className
      )}
    >
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "bg-primary font-medium text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span>{item.label}</span>
              </span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
