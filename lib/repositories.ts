import { getDatabase } from "@/lib/database"
import { toEnDigits } from "@/lib/jalali"

export type AppointmentStatus =
  "scheduled" | "completed" | "cancelled" | "no_show"

export type Customer = {
  id: number
  full_name: string
  phone: string
  notes: string | null
  updated_at: string
}

export type CustomerListRow = Customer & {
  total_sessions: number
  completed_sessions: number
  last_session_at: string | null
}

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
  service_ids: number[]
  therapist_id: number | null
  appointment: {
    status: AppointmentStatus
    notes: string
    referral?: string
  }
  sessions: SessionRange[]
}

export type AppointmentEdit = {
  service_ids: number[]
  therapist_id: number | null
  start_at: string
  end_at: string
  status: AppointmentStatus
  notes: string
  referral?: string
}

export type AppointmentRow = {
  id: number
  slug: string | null
  start_at: string
  end_at: string
  price: number
  status: AppointmentStatus
  service_ids: number[]
  service_names: string[]
  full_name: string
  phone: string
  notes: string | null
  referral?: string | null
  therapist_id: number | null
  therapist_name: string | null
  remaining?: number
}


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

async function resolveServices(ids: number[]) {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))]

  if (unique.length === 0) {
    return { services: [] as Service[], price: 0 }
  }

  const db = await getDatabase()
  const placeholders = unique.map(() => "?").join(", ")
  const rows = await db.select<Service[]>(
    `SELECT id, name, description, duration_minutes, price, is_active FROM services WHERE id IN (${placeholders})`,
    unique
  )

  const services = unique
    .map((id) => rows.find((item) => item.id === id))
    .filter((item): item is Service => item !== undefined)

  if (services.length < unique.length) {
    throw new Error("بعضی از خدمات انتخاب‌شده در پایگاه داده پیدا نشد.")
  }

  return {
    services,
    price: services.reduce((sum, item) => sum + item.price, 0),
  }
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
    "SELECT COUNT(*) AS count FROM appointment_services WHERE service_id = ?",
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


function normalizeCustomerQuery(value: string) {
  return toEnDigits(value)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u200c/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function listCustomers(limit = 20) {
  const db = await getDatabase()

  return db.select<Customer[]>(
    "SELECT id, full_name, phone, notes, updated_at FROM customers WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT ?",
    [limit]
  )
}

export async function listAllCustomers() {
  const db = await getDatabase()

  return db.select<CustomerListRow[]>(
    `SELECT customers.id,
            customers.full_name,
            customers.phone,
            customers.notes,
            customers.updated_at,
            COUNT(appointments.id) AS total_sessions,
            COALESCE(SUM(CASE WHEN appointments.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_sessions,
            MAX(appointments.start_at) AS last_session_at
     FROM customers
     LEFT JOIN appointments ON appointments.customer_id = customers.id
     WHERE customers.deleted_at IS NULL
     GROUP BY customers.id
     ORDER BY customers.updated_at DESC`
  )
}

export async function searchCustomers(query: string, limit = 8) {
  const needle = normalizeCustomerQuery(query)

  if (needle.length === 0) {
    return listCustomers(limit)
  }

  const db = await getDatabase()
  const like = `%${needle}%`

  return db.select<Customer[]>(
    `SELECT id, full_name, phone, notes, updated_at
     FROM customers
     WHERE deleted_at IS NULL
       AND (
         REPLACE(REPLACE(full_name, 'ي', 'ی'), 'ك', 'ک') LIKE ?
         OR REPLACE(phone, ' ', '') LIKE ?
       )
     ORDER BY
       CASE WHEN REPLACE(REPLACE(full_name, 'ي', 'ی'), 'ك', 'ک') = ? THEN 0 ELSE 1 END,
       updated_at DESC
     LIMIT ?`,
    [like, like.replace(/\s/g, ""), needle, limit]
  )
}


async function findBusyRanges(sessions: SessionRange[], excludeId?: number) {
  const db = await getDatabase()
  const busy: SessionRange[] = []

  for (const session of sessions) {
    const rows = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) AS count FROM appointments WHERE status = 'scheduled' AND id != ? AND start_at < ? AND end_at > ?",
      [excludeId ?? -1, session.end_at, session.start_at]
    )

    if ((rows[0]?.count ?? 0) > 0) {
      busy.push(session)
    }
  }

  return busy
}

async function resolveCustomerId(customer: NewBooking["customer"]) {
  const db = await getDatabase()
  const fullName = customer.full_name
  const phone = customer.phone

  const rows =
    phone.length > 0
      ? await db.select<{ id: number }[]>(
        "SELECT id FROM customers WHERE phone = ? AND deleted_at IS NULL LIMIT 1",
        [phone]
      )
      : await db.select<{ id: number }[]>(
        "SELECT id FROM customers WHERE (phone = '' OR phone IS NULL) AND full_name = ? AND deleted_at IS NULL LIMIT 1",
        [fullName]
      )

  if (rows.length > 0) {
    await db.execute("UPDATE customers SET full_name = ? WHERE id = ?", [
      fullName,
      rows[0].id,
    ])

    return rows[0].id
  }

  const result = await db.execute(
    "INSERT INTO customers (full_name, phone) VALUES (?, ?)",
    [fullName, phone]
  )

  return Number(result.lastInsertId)
}

async function replaceAppointmentServices(
  appointmentId: number,
  services: Service[]
) {
  const db = await getDatabase()

  await db.execute(
    "DELETE FROM appointment_services WHERE appointment_id = ?",
    [appointmentId]
  )

  for (const item of services) {
    await db.execute(
      "INSERT OR IGNORE INTO appointment_services (appointment_id, service_id) VALUES (?, ?)",
      [appointmentId, item.id]
    )
  }
}

export async function createBooking(booking: NewBooking) {
  const db = await getDatabase()
  const { services, price } = await resolveServices(booking.service_ids)

  const busy = await findBusyRanges(booking.sessions)

  if (busy.length > 0) {
    throw new Error(
      `این وقت با نوبت دیگری تداخل دارد: ${busy
        .map((session) => session.preview)
        .join("، ")}`
    )
  }

  const customerId = await resolveCustomerId(booking.customer)
  const slug = `${customerId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`

  for (const session of booking.sessions) {
    const result = await db.execute(
      "INSERT INTO appointments (customer_id, service_id, therapist_id, start_at, end_at, price, status, notes, referral , slug) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? , ?)",
      [
        customerId,
        services[0]?.id ?? null,
        booking.therapist_id,
        session.start_at,
        session.end_at,
        price,
        booking.appointment.status,
        booking.appointment.notes.length > 0 ? booking.appointment.notes : null,
        booking.appointment.referral || null,
        slug
      ]
    )

    await replaceAppointmentServices(Number(result.lastInsertId), services)
  }

  return booking.sessions.length
}

const appointmentSelect = `SELECT appointments.id,
            appointments.slug,
            appointments.start_at,
            appointments.end_at,
            appointments.price,
            appointments.status,
            appointments.notes,
            appointments.therapist_id,
            appointments.referral,
            customers.full_name,
            customers.phone,
            therapists.name AS therapist_name
     FROM appointments
     INNER JOIN customers ON customers.id = appointments.customer_id
     LEFT JOIN therapists ON therapists.id = appointments.therapist_id`

type AppointmentBaseRow = Omit<AppointmentRow, "service_ids" | "service_names">

async function withServices(rows: AppointmentBaseRow[]) {
  if (rows.length === 0) {
    return [] as AppointmentRow[]
  }

  const db = await getDatabase()
  const ids = rows.map((row) => row.id)
  const placeholders = ids.map(() => "?").join(", ")
  const links = await db.select<
    {
      appointment_id: number
      service_id: number
      name: string
    }[]
  >(
    `SELECT appointment_services.appointment_id AS appointment_id,
            appointment_services.service_id AS service_id,
            services.name AS name
     FROM appointment_services
     INNER JOIN services ON services.id = appointment_services.service_id
     WHERE appointment_services.appointment_id IN (${placeholders})
     ORDER BY appointment_services.appointment_id, appointment_services.service_id`,
    ids
  )

  const grouped = new Map<number, { id: number; name: string }[]>()

  for (const link of links) {
    const list = grouped.get(link.appointment_id) ?? []
    list.push({ id: link.service_id, name: link.name })
    grouped.set(link.appointment_id, list)
  }

  return rows.map((row) => {
    const services = grouped.get(row.id) ?? []

    return {
      ...row,
      service_ids: services.map((item) => item.id),
      service_names: services.map((item) => item.name),
    }
  })
}

export async function updateAppointment(id: number, input: AppointmentEdit) {
  const db = await getDatabase()
  const { services, price } = await resolveServices(input.service_ids)

  const busy = await findBusyRanges(
    [
      {
        start_at: input.start_at,
        end_at: input.end_at,
        preview: "",
      },
    ],
    id
  )

  if (input.status === "scheduled" && busy.length > 0) {
    throw new Error("این بازه با نوبت دیگری تداخل دارد.")
  }

  await db.execute(
    "UPDATE appointments SET service_id = ? , referral = ?, therapist_id = ?, start_at = ?, end_at = ?, price = ?, status = ?, notes = ?, updated_at = ? WHERE id = ?",
    [
      services[0]?.id ?? null,
      input.referral || null,
      input.therapist_id,
      input.start_at,
      input.end_at,
      price,
      input.status,
      input.notes.length > 0 ? input.notes : null,
      new Date().toISOString(),
      id,
    ]
  )

  await replaceAppointmentServices(id, services)
}

export async function listForRange(from: Date, to: Date) {
  const db = await getDatabase()

  const rows = await db.select<AppointmentBaseRow[]>(
    `${appointmentSelect}
     WHERE appointments.start_at >= ? AND appointments.start_at < ?
     ORDER BY appointments.start_at`,
    [from.toISOString(), to.toISOString()]
  )

  return withServices(rows)
}

export async function listBookingSessions(slug: string) {
  const db = await getDatabase()

  const rows = await db.select<AppointmentBaseRow[]>(
    `${appointmentSelect}
     WHERE appointments.slug = ?
     ORDER BY appointments.start_at, appointments.id`,
    [slug]
  )

  return withServices(rows)
}

export async function listCustomerAppointments(customerId: number) {
  const db = await getDatabase()

  const rows = await db.select<AppointmentBaseRow[]>(
    `${appointmentSelect}
     WHERE customers.id = ?
     ORDER BY appointments.start_at, appointments.id`,
    [customerId]
  )

  return withServices(rows)
}

export async function listAllAppointments(limit = 500) {
  const db = await getDatabase()

  const rows = await db.select<AppointmentBaseRow[]>(
    `${appointmentSelect}
     ORDER BY appointments.start_at DESC
     LIMIT ?`,
    [limit]
  )

  return withServices(rows)
}

export async function setAppointmentStatus(
  id: number,
  status: AppointmentStatus
) {
  const db = await getDatabase()

  await db.execute(
    "UPDATE appointments SET status = ?, updated_at = ? WHERE id = ?",
    [status, new Date().toISOString(), id]
  )
}

export async function deleteAppointment(id: number) {
  const db = await getDatabase()

  await db.execute(
    "DELETE FROM appointment_services WHERE appointment_id = ?",
    [id]
  )
  await db.execute("DELETE FROM appointments WHERE id = ?", [id])
}

export async function completeDayAppointments(from: Date, to: Date) {
  const db = await getDatabase()

  const result = await db.execute(
    "UPDATE appointments SET status = 'completed', updated_at = ? WHERE status = 'scheduled' AND start_at >= ? AND start_at < ?",
    [new Date().toISOString(), from.toISOString(), to.toISOString()]
  )

  return result.rowsAffected
}

export async function reopenDayAppointments(from: Date, to: Date) {
  const db = await getDatabase()

  const result = await db.execute(
    "UPDATE appointments SET status = 'scheduled', updated_at = ? WHERE status = 'completed' AND start_at >= ? AND start_at < ?",
    [new Date().toISOString(), from.toISOString(), to.toISOString()]
  )

  return result.rowsAffected
}
