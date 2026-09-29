"use client"

import { useState } from "react"
import { getDatabase } from "@/lib/database"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [message, setMessage] = useState("Database not connected")

  async function testDatabase() {
    try {
      const db = await getDatabase()

      const result = await db.select<{ name: string }[]>(
        "SELECT name FROM sqlite_master WHERE type = 'table'"
      )

      setMessage(
        `Connected. Tables: ${result.map((item) => item.name).join(", ")}`
      )
    } catch (error) {
      setMessage(`Database error: ${String(error)}`)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-3xl font-bold">Massage Booking</h1>

      <Button
        onClick={testDatabase}
        className="rounded-lg bg-primary px-6 py-3 text-primary-foreground"
      >
        Test SQLite
      </Button>

      <p>{message}</p>
    </main>
  )
}
