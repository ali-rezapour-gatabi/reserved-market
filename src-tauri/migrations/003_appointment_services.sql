PRAGMA foreign_keys = ON;

CREATE TABLE appointments_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    service_id INTEGER,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    price INTEGER NOT NULL CHECK(price >= 0),
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK(status IN ('scheduled', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    therapist_id INTEGER REFERENCES therapists(id),
    FOREIGN KEY(customer_id) REFERENCES customers(id),
    FOREIGN KEY(service_id) REFERENCES services(id),
    CHECK(end_at > start_at)
);

INSERT INTO appointments_new (
    id, customer_id, service_id, therapist_id, start_at, end_at,
    price, status, notes, created_at, updated_at
)
SELECT
    id, customer_id, service_id, therapist_id, start_at, end_at,
    price, status, notes, created_at, updated_at
FROM appointments;

DROP TABLE appointments;

ALTER TABLE appointments_new RENAME TO appointments;

CREATE INDEX IF NOT EXISTS idx_appointments_start_at
ON appointments(start_at);

CREATE INDEX IF NOT EXISTS idx_appointments_customer_id
ON appointments(customer_id);

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_id
ON appointments(therapist_id);

CREATE TABLE IF NOT EXISTS appointment_services (
    appointment_id INTEGER NOT NULL,
    service_id INTEGER NOT NULL,
    PRIMARY KEY(appointment_id, service_id),
    FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
    FOREIGN KEY(service_id) REFERENCES services(id)
);

CREATE INDEX IF NOT EXISTS idx_appointment_services_service_id
ON appointment_services(service_id);

INSERT OR IGNORE INTO appointment_services (appointment_id, service_id)
SELECT id, service_id FROM appointments WHERE service_id IS NOT NULL;
