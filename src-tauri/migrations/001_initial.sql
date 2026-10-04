PRAGMA foreign_keys = ON;

CREATE TABLE
    IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        deleted_at TEXT
    );

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);

CREATE TABLE
    IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
        price INTEGER NOT NULL CHECK (price >= 0),
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

CREATE TABLE
    IF NOT EXISTS therapists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        specialty TEXT,
        phone TEXT,
        description TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

CREATE TABLE
    appointments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT,
        customer_id INTEGER NOT NULL,
        service_id INTEGER,
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        price INTEGER NOT NULL CHECK (price >= 0),
        status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
            status IN ('scheduled', 'completed', 'cancelled', 'no_show')
        ),
        notes TEXT,
        referral TEXT,
        created_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime ('%Y-%m-%dT%H:%M:%fZ', 'now')),
        therapist_id INTEGER REFERENCES therapists (id),
        FOREIGN KEY (customer_id) REFERENCES customers (id),
        FOREIGN KEY (service_id) REFERENCES services (id),
        CHECK (end_at > start_at)
    );

CREATE TABLE
    IF NOT EXISTS appointment_services (
        appointment_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        PRIMARY KEY (appointment_id, service_id),
        FOREIGN KEY (appointment_id) REFERENCES appointments (id) ON DELETE CASCADE,
        FOREIGN KEY (service_id) REFERENCES services (id)
    );