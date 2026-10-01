import { getDatabase } from "@/lib/database"

export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show"

export type Service = {
  id: number
  name: string
  description: string | null
  duration_minutes: number
  price: number
  is_active: number
}

export type Therapist = {
  id: number
  name: string
  specialty: string | null
  phone: string | null
  description: string | null
  is_active: number
}

export type ServiceInput = {
  name: string
  description: string
  duration_minutes: number
  price: number
}

export type TherapistInput = {
  name: string
  specialty: string
  phone: string
  description: string
}

export type SessionRange = {
  start_at: string
  end_at: string
  preview: string
}

export type NewBooking = {
  customer: {
    full_name: string
    phone: string
  }
  service_id: number
  therapist_id: number | null
  appointment: {
    status: AppointmentStatus
    notes: string
  }
  sessions: SessionRange[]
}

export type AppointmentRow = {
  id: number
  start_at: string
  end_at: string
  status: AppointmentStatus
  service_name: string
  full_name: string
  phone: string
  therapist_id: number | null
  therapist_name: string | null
}

/* ---------------------------------- services --------------------------------- */

export async function listAllServices() {
  const db = await getDatabase()

  return db.select<Service[]>(
    "SELECT id, name, description, duration_minutes, price, is_active FROM services ORDER BY id"
  )
}

export async function listServices() {
  const db = await getDatabase()

  return db.select<Service[]>(
    "SELECT id, name, description, duration_minutes, price, is_active FROM services WHERE is_active = 1 ORDER BY id"
  )
}

async function findService(id: number) {
  const db = await getDatabase()
  const rows = await db.select<Service[]>(
    "SELECT id, name, description, duration_minutes, price, is_active FROM services WHERE id = ?",
    [id]
  )

  return rows[0] ?? null
}

export async function createService(input: ServiceInput) {
  const db = await getDatabase()

  await db.execute(
    "INSERT INTO services (name, description, duration_minutes, price) VALUES (?, ?, ?, ?)",
    [
      input.name,
      input.description.length > 0 ? input.description : null,
      input.duration_minutes,
      input.price,
    ]
  )

  return listAllServices()
}

export async function updateService(id: number, input: ServiceInput) {
  const db = await getDatabase()

  await db.execute(
    "UPDATE services SET name = ?, description = ?, duration_minutes = ?, price = ?, updated_at = ? WHERE id = ?",
    [
      input.name,
      input.description.length > 0 ? input.description : null,
      input.duration_minutes,
      input.price,
      new Date().toISOString(),
      id,
    ]
  )

  return listAllServices()
}

export async function setServiceActive(id: number, active: boolean) {
  const db = await getDatabase()

  await db.execute(
    "UPDATE services SET is_active = ?, updated_at = ? WHERE id = ?",
    [active ? 1 : 0, new Date().toISOString(), id]
  )

  return listAllServices()
}

export async function deleteService(id: number) {
  const db = await getDatabase()

  const referencing = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM appointments WHERE service_id = ?",
    [id]
  )

  if ((referencing[0]?.count ?? 0) > 0) {
    throw new Error(
      "این خدمت در نوبت‌ها استفاده شده است؛ نمی‌توان آن را حذف کرد. به‌جای حذف، آن را غیرفعال کنید."
    )
  }

  await db.execute("DELETE FROM services WHERE id = ?", [id])

  return listAllServices()
}

/* --------------------------------- therapists -------------------------------- */

export async function listAllTherapists() {
  const db = await getDatabase()

  return db.select<Therapist[]>(
    "SELECT id, name, specialty, phone, description, is_active FROM therapists ORDER BY id"
  )
}

export async function listTherapists() {
  const db = await getDatabase()

  return db.select<Therapist[]>(
    "SELECT id, name, specialty, phone, description, is_active FROM therapists WHERE is_active = 1 ORDER BY id"
  )
}

export async function createTherapist(input: TherapistInput) {
  const db = await getDatabase()

  await db.execute(
    "INSERT INTO therapists (name, specialty, phone, description) VALUES (?, ?, ?, ?)",
    [
      input.name,
      input.specialty.length > 0 ? input.specialty : null,
      input.phone.length > 0 ? input.phone : null,
      input.description.length > 0 ? input.description : null,
    ]
  )

  return listAllTherapists()
}

export async function updateTherapist(id: number, input: TherapistInput) {
  const db = await getDatabase()

  await db.execute(
    "UPDATE therapists SET name = ?, specialty = ?, phone = ?, description = ?, updated_at = ? WHERE id = ?",
    [
      input.name,
      input.specialty.length > 0 ? input.specialty : null,
      input.phone.length > 0 ? input.phone : null,
      input.description.length > 0 ? input.description : null,
      new Date().toISOString(),
      id,
    ]
  )

  return listAllTherapists()
}

export async function setTherapistActive(id: number, active: boolean) {
  const db = await getDatabase()

  await db.execute(
    "UPDATE therapists SET is_active = ?, updated_at = ? WHERE id = ?",
    [active ? 1 : 0, new Date().toISOString(), id]
  )

  return listAllTherapists()
}

export async function deleteTherapist(id: number) {
  const db = await getDatabase()

  const referencing = await db.select<{ count: number }[]>(
    "SELECT COUNT(*) AS count FROM appointments WHERE therapist_id = ?",
    [id]
  )

  if ((referencing[0]?.count ?? 0) > 0) {
    throw new Error(
      "این متخصص در نوبت‌ها استفاده شده است؛ نمی‌توان او را حذف کرد. به‌جای حذف، او را غیرفعال کنید."
    )
  }

  await db.execute("DELETE FROM therapists WHERE id = ?", [id])

  return listAllTherapists()
}

/* -------------------------------- appointments ------------------------------- */

async function findBusyRanges(sessions: SessionRange[]) {
  const db = await getDatabase()
  const busy: string[] = []

  for (const session of sessions) {
    const rows = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) AS count FROM appointments WHERE status = 'scheduled' AND start_at < ? AND end_at > ?",
      [session.end_at, session.start_at]
    )

    if ((rows[0]?.count ?? 0) > 0) {
      busy.push(session.preview)
    }
  }

  return busy
}

async function resolveCustomerId(customer: NewBooking["customer"]) {
  const db = await getDatabase()
  const rows = await db.select<{ id: number }[]>(
    "SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1",
    [customer.phone]
  )

  if (rows.length > 0) {
    await db.execute(
      "UPDATE customers SET full_name = ? WHERE id = ?",
      [customer.full_name, rows[0].id]
    )

    return rows[0].id
  }

  const result = await db.execute(
    "INSERT INTO customers (full_name, phone) VALUES (?, ?)",
    [customer.full_name, customer.phone]
  )

  return Number(result.lastInsertId)
}

export async function createBooking(booking: NewBooking) {
  const db = await getDatabase()
  const service = await findService(booking.service_id)

  if (service === null) {
    throw new Error("خدمت انتخاب‌شده در پایگاه داده پیدا نشد.")
  }

  const busy = await findBusyRanges(booking.sessions)

  if (busy.length > 0) {
    throw new Error(`این وقت با نوبت دیگری تداخل دارد: ${busy.join("، ")}`)
  }

  const customerId = await resolveCustomerId(booking.customer)

  for (const session of booking.sessions) {
    await db.execute(
      "INSERT INTO appointments (customer_id, service_id, therapist_id, start_at, end_at, price, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        customerId,
        service.id,
        booking.therapist_id,
        session.start_at,
        session.end_at,
        service.price,
        booking.appointment.status,
        booking.appointment.notes.length > 0 ? booking.appointment.notes : null,
      ]
    )
  }

  return booking.sessions.length
}

const appointmentSelect = `SELECT appointments.id,
            appointments.start_at,
            appointments.end_at,
            appointments.status,
            appointments.therapist_id,
            services.name AS service_name,
            customers.full_name,
            customers.phone,
            therapists.name AS therapist_name
     FROM appointments
     INNER JOIN services ON services.id = appointments.service_id
     INNER JOIN customers ON customers.id = appointments.customer_id
     LEFT JOIN therapists ON therapists.id = appointments.therapist_id`

export async function listUpcoming(limit = 200) {
  const db = await getDatabase()

  return db.select<AppointmentRow[]>(
    `${appointmentSelect}
     WHERE appointments.status = 'scheduled' AND appointments.end_at > ?
     ORDER BY appointments.start_at
     LIMIT ?`,
    [new Date().toISOString(), limit]
  )
}

export async function listForDay(from: Date, to: Date) {
  const db = await getDatabase()

  return db.select<AppointmentRow[]>(
    `${appointmentSelect}
     WHERE appointments.start_at >= ? AND appointments.start_at < ?
     ORDER BY appointments.start_at`,
    [from.toISOString(), to.toISOString()]
  )
}

export async function listAllAppointments(limit = 500) {
  const db = await getDatabase()

  return db.select<AppointmentRow[]>(
    `${appointmentSelect}
     ORDER BY appointments.start_at DESC
     LIMIT ?`,
    [limit]
  )
}
