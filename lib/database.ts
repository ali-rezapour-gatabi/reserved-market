import Database from "@tauri-apps/plugin-sql"

let db: Database | null = null

export async function getDatabase() {
  if (db === null) {
    db = new Database("sqlite:massage.db")
  }

  return db
}
