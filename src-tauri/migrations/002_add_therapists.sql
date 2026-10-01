
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS therapists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

ALTER TABLE appointments
    ADD COLUMN therapist_id INTEGER REFERENCES therapists(id);

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id
ON appointments(therapist_id);
