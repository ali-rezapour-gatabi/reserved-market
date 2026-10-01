import type Database from "@tauri-apps/plugin-sql"

let db: Database | null = null

export function isDesktop() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
}

export async function getDatabase() {
  if (!isDesktop()) {
    throw new Error("پایگاه داده فقط در نسخه دسکتاپ در دسترس است.")
  }

  if (db === null) {
    const { default: SqlDatabase } = await import("@tauri-apps/plugin-sql")
    db = await SqlDatabase.load("sqlite:massage.db")
  }

  return db
}
