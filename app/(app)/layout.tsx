import Header from "@/components/header"
import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <main className="min-h-screen space-y-4 p-4">
      <Header />

      <div className="flex flex-col gap-4 lg:flex-row">
        <AppSidebar />

        <div className="min-w-0 flex-1 space-y-4">{children}</div>
      </div>
    </main>
  )
}
