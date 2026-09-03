import { NextRequest, NextResponse } from 'next/server'
import { resolveTargetUser } from '@/lib/api-helpers'

type QrCodeRow = {
  id: string
  user_id: string
  label: string
  location_id: string | null
  created_at: string
  locations?: { name?: string } | null
}

type LocationRow = {
  id: string
  name: string
  address: string
  google_review_url: string
  created_at: string
}

const QR_SELECT = 'id, user_id, label, location_id, created_at, locations(name)'

/** GET /api/qr/codes — QR kodų sąrašas su statistika + vietos + plano limitai. */
export async function GET(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan, metadata } = guard

  try {
    const threshold = Number(metadata.google_min_rating) || 4

    // Vietos (QR susiejimui) — tik Verslas planui. Startas/Pro vietų neturi:
    // jų QR kodai naudoja metadata.google_review_url (sena elgsena).
    let locations: LocationRow[] = []
    if (plan.usesLocations) {
      const { data: locationsData } = await client
        .from('locations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at')
      locations = (locationsData || []) as LocationRow[]

    }

    const { data: codes } = await client
      .from('qr_codes')
      .select(QR_SELECT)
      .eq('user_id', userId)
      .order('created_at')
    let qrCodes = (codes || []) as unknown as QrCodeRow[]

    // Verslas planui QR kodas atsiranda tik tada, kai sukurta bent viena vieta
    // su Google Review nuoroda. Pro planui paliekamas senas URL kelias.
    const hasLocationWithUrl = locations.some((location) => location.google_review_url.trim().length > 0)
    if (qrCodes.length === 0 && (plan.usesLocations ? hasLocationWithUrl : (typeof metadata.google_review_url === 'string' && metadata.google_review_url.trim().length > 0))) {
      const { data: created } = await client
        .from('qr_codes')
        .insert({ user_id: userId, label: 'Pagrindinis QR kodas', location_id: locations[0]?.id ?? null })
        .select(QR_SELECT)
      qrCodes = (created || []) as unknown as QrCodeRow[]
    }

    // Agreguota statistika iš DB funkcijų (be eilučių grąžinimo)
    const [scanResult, feedbackResult, fiveStarResult] = await Promise.all([
      client.rpc('qr_scan_stats', { p_user: userId }),
      client.rpc('qr_feedback_stats', { p_user: userId, p_threshold: threshold }),
      client.from('feedbacks').select('qr_code_id, rating').eq('user_id', userId).eq('rating', 5),
    ])
    const scansByQr = new Map<string, number>()
    for (const row of (scanResult.data || []) as Array<{ qr_code_id: string | null; scans: number }>) {
      if (row.qr_code_id) scansByQr.set(row.qr_code_id, Number(row.scans) || 0)
    }
    const feedbackByQr = new Map<string, { total: number; positive: number; negative: number; average: number | null }>()
    for (const row of (feedbackResult.data || []) as Array<{ qr_code_id: string | null; total: number; positive: number; negative: number; average: number | null }>) {
      if (row.qr_code_id) {
        feedbackByQr.set(row.qr_code_id, {
          total: Number(row.total) || 0,
          positive: Number(row.positive) || 0,
          negative: Number(row.negative) || 0,
          average: row.average === null ? null : Number(row.average),
        })
      }
    }
    const fiveStarsByQr = new Map<string, number>()
    for (const row of fiveStarResult.data || []) {
      if (row.qr_code_id) fiveStarsByQr.set(row.qr_code_id, (fiveStarsByQr.get(row.qr_code_id) || 0) + 1)
    }

    const rows = qrCodes.map((code) => {
      const feedback = feedbackByQr.get(code.id)
      return {
        id: code.id,
        label: code.label,
        location_id: code.location_id,
        location_name: code.locations?.name || null,
        created_at: code.created_at,
        scans: scansByQr.get(code.id) ?? 0,
        feedbacks: feedback?.total ?? 0,
        positive: feedback?.positive ?? 0,
        negative: feedback?.negative ?? 0,
        average: feedback?.average ?? null,
        five_stars: fiveStarsByQr.get(code.id) ?? 0,
      }
    })

    return NextResponse.json({
      qr_codes: rows,
      locations,
      threshold,
      limits: {
        plan: plan.id,
        plan_name: plan.name,
        max_qr: plan.maxQrCodes,
        current_qr: rows.length,
        max_locations: plan.maxLocations,
      },
    })
  } catch (cause) {
    console.error('[api/qr/codes] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** POST /api/qr/codes — naujas QR kodas (tikrinamas plano limitas). */
export async function POST(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan } = guard

  try {
    const body = await request.json() as { label?: string; location_id?: string | null }
    const label = (body.label || '').trim()
    if (!label) return NextResponse.json({ error: 'Įrašykite QR kodo pavadinimą (pvz. „Stalas 1“).' }, { status: 400 })

    if (plan.usesLocations && (!body.location_id || typeof body.location_id !== 'string')) {
      return NextResponse.json({ error: 'Pirmiausia sukurkite vietą su Google Review nuoroda ir susiekite QR kodą su ja.' }, { status: 400 })
    }

    const { count } = await client
      .from('qr_codes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (plan.maxQrCodes >= 0 && (count ?? 0) >= plan.maxQrCodes) {
      return NextResponse.json({
        error: `Jūsų „${plan.name}“ planas leidžia ${plan.maxQrCodes} QR kodą. Norėdami kurti daugiau QR kodų, atsinaujinkite planą.`,
      }, { status: 403 })
    }

    // Vietą galima susieti tik su savo vieta
    let locationId: string | null = null
    if (typeof body.location_id === 'string' && body.location_id) {
      const { data: location } = await client
        .from('locations')
        .select('id, google_review_url')
        .eq('id', body.location_id)
        .eq('user_id', userId)
        .single()
      if (!location) return NextResponse.json({ error: 'Vieta nerasta.' }, { status: 400 })
      if (plan.usesLocations && !location.google_review_url) return NextResponse.json({ error: 'Pasirinkta vieta neturi Google Review nuorodos.' }, { status: 400 })
      locationId = location.id
    }

    const { data, error } = await client
      .from('qr_codes')
      .insert({ user_id: userId, label, location_id: locationId })
      .select(QR_SELECT)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, qr_code: data })
  } catch (cause) {
    console.error('[api/qr/codes] POST nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** PATCH /api/qr/codes — QR kodo pavadinimo ar vietos keitimas (location_id: null — atsieti). */
export async function PATCH(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId } = guard

  try {
    const body = await request.json() as { id?: string; label?: string; location_id?: string | null }
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (typeof body.label === 'string') {
      const label = body.label.trim()
      if (!label) return NextResponse.json({ error: 'QR kodo pavadinimas negali būti tuščias.' }, { status: 400 })
      updates.label = label
    }
    if ('location_id' in body) {
      if (body.location_id === null) {
        updates.location_id = null
      } else if (typeof body.location_id === 'string') {
        const { data: location } = await client
          .from('locations')
          .select('id')
          .eq('id', body.location_id)
          .eq('user_id', userId)
          .single()
        if (!location) return NextResponse.json({ error: 'Vieta nerasta.' }, { status: 400 })
        updates.location_id = location.id
      }
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nėra keičiamų laukų.' }, { status: 400 })
    }

    const { data, error } = await client
      .from('qr_codes')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', userId)
      .select(QR_SELECT)
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'QR kodas nerastas.' }, { status: 404 })
    return NextResponse.json({ ok: true, qr_code: data })
  } catch (cause) {
    console.error('[api/qr/codes] PATCH nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** DELETE /api/qr/codes — QR kodo ištryninmas (atsiliepimai lieka, tik atsiejami). */
export async function DELETE(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId } = guard

  try {
    const body = await request.json() as { id?: string }
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await client
      .from('qr_codes')
      .delete()
      .eq('id', body.id)
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error('[api/qr/codes] DELETE nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}