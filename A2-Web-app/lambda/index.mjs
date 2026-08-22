// lambda/index.mjs — IHC Serverless API (BR E.1: custom server-side logic)
//
// Routes (Function URL, auth type NONE — every route verifies a Firebase ID token):
//   POST   /booking        — validate booking against custom business rules, then create it
//   DELETE /booking/{id}   — cancel a booking (owner or admin only)
//   POST   /email          — send an email with optional attachment via the Resend API (BR D.2)
//
// BR (E.1): the booking conflict detection / clinic-hours validation below is custom
// business logic — it cannot be replaced by a cloud database or a third-party API.
//
// Environment variables:
//   FIREBASE_SERVICE_ACCOUNT — full JSON contents of the Firebase service-account key
//   RESEND_API_KEY           — Resend API key (BR D.2)
//   ALLOWED_ORIGIN           — CORS origin of the frontend (Cloudflare Pages URL)

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')
if (!serviceAccount.project_id) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing or invalid.')
}

initializeApp({ credential: cert(serviceAccount) })

const db = getFirestore()
const authAdmin = getAuth()

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*'

// --- Clinic business rules (BR E.1: custom server-side logic) ---
const CLINIC_OPEN = '09:00'
const CLINIC_CLOSE = '16:00'
const SLOT_MINUTES = 30
const MAX_DURATION_MINUTES = 120
const MAX_BOOKINGS_PER_DAY = 12

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function validateBookingRules({ date, startTime, endTime }, existingBookings) {
  const errors = []

  // Rule 1: date must be today or in the future
  const today = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD (local)
  if (date < today) {
    errors.push('Appointment date cannot be in the past.')
  }

  // Rule 2: within clinic hours
  if (startTime < CLINIC_OPEN || endTime > CLINIC_CLOSE) {
    errors.push(`Bookings must be within clinic hours (${CLINIC_OPEN}–${CLINIC_CLOSE}).`)
  }

  // Rule 3: 30-minute grid alignment and duration limits
  const startMin = toMinutes(startTime)
  const endMin = toMinutes(endTime)
  const duration = endMin - startMin
  if (duration <= 0) {
    errors.push('End time must be after the start time.')
  }
  if (startMin % SLOT_MINUTES !== 0 || endMin % SLOT_MINUTES !== 0) {
    errors.push(`Booking times must align to ${SLOT_MINUTES}-minute slots.`)
  }
  if (duration > MAX_DURATION_MINUTES) {
    errors.push(`Maximum booking duration is ${MAX_DURATION_MINUTES} minutes.`)
  }

  // Rule 4: no overlap with existing bookings for the same practitioner + date
  const conflicts = existingBookings.filter(
    b => b.startTime < endTime && startTime < b.endTime
  )
  if (conflicts.length > 0) {
    errors.push(
      `This practitioner already has a booking from ${conflicts[0].startTime} to ${conflicts[0].endTime} on ${date}.`
    )
  }

  // Rule 5: daily capacity per practitioner
  if (existingBookings.length >= MAX_BOOKINGS_PER_DAY) {
    errors.push(`This practitioner has reached the daily limit of ${MAX_BOOKINGS_PER_DAY} bookings.`)
  }

  return errors
}

// ============================================================
// HTTP helpers
// NOTE: CORS is handled by the Function URL's native CORS configuration
// (AWS injects Access-Control-* headers on responses with an Origin).
// Adding them here as well would produce DUPLICATE headers, which browsers
// reject ("Failed to fetch" / Network Error) even though the request
// succeeded server-side.
// ============================================================
function corsHeaders() {
  // Fallback used ONLY by the OPTIONS branch, for the case where the
  // Function URL has no CORS configuration at all.
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  }
}

function respond(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
}

async function verifyToken(event) {
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!idToken) return null
  try {
    return await authAdmin.verifyIdToken(idToken)
  } catch {
    return null
  }
}

// ============================================================
// POST /booking — validate + create (BR E.1)
// ============================================================
async function handleCreateBooking(event, decodedToken) {
  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return respond(400, { success: false, message: 'Invalid JSON body.' })
  }

  const { date, startTime, endTime, practitioner } = payload || {}
  if (!date || !startTime || !endTime || !practitioner) {
    return respond(400, { success: false, message: 'date, startTime, endTime and practitioner are required.' })
  }

  // Load today's existing bookings for this practitioner
  const snapshot = await db.collection('bookings')
    .where('practitioner', '==', practitioner)
    .where('date', '==', date)
    .get()
  const existingBookings = snapshot.docs.map(d => d.data())

  // Custom business rules (BR E.1)
  const errors = validateBookingRules({ date, startTime, endTime }, existingBookings)
  if (errors.length > 0) {
    return respond(409, { success: false, message: errors.join(' ') })
  }

  // Create the booking (service account bypasses the client-only-read rules)
  const bookingRef = await db.collection('bookings').add({
    date,
    startTime,
    endTime,
    practitioner,
    bookedBy: decodedToken.name || decodedToken.email || decodedToken.uid,
    bookedByEmail: decodedToken.email || '',
    bookedByUid: decodedToken.uid,
    createdAt: FieldValue.serverTimestamp()
  })

  return respond(201, { success: true, bookingId: bookingRef.id })
}

// ============================================================
// DELETE /booking/{id} — cancel (owner or admin)
// ============================================================
async function handleCancelBooking(bookingId, decodedToken) {
  if (!bookingId) {
    return respond(400, { success: false, message: 'Booking id is required.' })
  }

  const ref = db.collection('bookings').doc(bookingId)
  const doc = await ref.get()
  if (!doc.exists) {
    return respond(404, { success: false, message: 'Booking not found.' })
  }

  const booking = doc.data()
  const isOwner = booking.bookedByUid === decodedToken.uid
  const isAdmin = decodedToken.admin === true
  if (!isOwner && !isAdmin) {
    return respond(403, { success: false, message: 'You can only cancel your own bookings.' })
  }

  await ref.delete()
  return respond(200, { success: true })
}

// ============================================================
// POST /email — send email with optional attachment via Resend (BR D.2)
// ============================================================
async function handleSendEmail(event) {
  if (!process.env.RESEND_API_KEY) {
    return respond(500, { success: false, message: 'RESEND_API_KEY is not configured on the server.' })
  }

  let payload
  try {
    payload = JSON.parse(event.body || '{}')
  } catch {
    return respond(400, { success: false, message: 'Invalid JSON body.' })
  }

  const { to, subject, text, attachment } = payload || {}
  if (!to || !subject) {
    return respond(400, { success: false, message: 'to and subject are required.' })
  }

  const emailBody = {
    from: 'Indigenous Health Connect <onboarding@resend.dev>',
    to: [to],
    subject,
    text: text || ''
  }
  // BR (D.2): attachment support (filename + base64 content)
  if (attachment && attachment.filename && attachment.contentBase64) {
    emailBody.attachments = [
      { filename: attachment.filename, content: attachment.contentBase64 }
    ]
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailBody)
  })
  const data = await res.json()

  if (!res.ok) {
    return respond(502, { success: false, message: `Email service error: ${data.message || res.status}` })
  }
  return respond(200, { success: true, emailId: data.id })
}

// ============================================================
// Main handler (Function URL uses payload format 2.0)
// ============================================================
export async function handler(event) {
  const http = event.requestContext?.http || {}
  const method = http.method || 'POST'
  const path = http.path || '/'

  // CORS preflight
  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' }
  }

  // Every route requires a valid Firebase ID token (BR C.4)
  const decodedToken = await verifyToken(event)
  if (!decodedToken) {
    return respond(401, { success: false, message: 'Unauthorized: a valid Firebase ID token is required.' })
  }

  if (method === 'POST' && path.endsWith('/booking')) {
    return handleCreateBooking(event, decodedToken)
  }
  if (method === 'DELETE' && path.includes('/booking/')) {
    return handleCancelBooking(path.split('/').pop(), decodedToken)
  }
  if (method === 'POST' && path.endsWith('/email')) {
    return handleSendEmail(event)
  }

  return respond(404, { success: false, message: 'Route not found.' })
}