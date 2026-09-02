import { NextRequest, NextResponse } from 'next/server'
import { normalizeGoogleReviewUrl, resolveTargetUser } from '@/lib/api-helpers'

type LocationRow = {
  id: string
  user_id: string
  name: string
  address: string
  google_review_url: string
  created_at: string
}

/** GET /api/locations — vartotojo vietų sąrašas + plano limitai. */
export async function GET(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan, metadata } = guard

  try {
    // „Vietų" sistema tik Verslas planui. Startas/Pro naudoja senąją elgseną:
    // viena Google Review nuoroda metadata.google_review_url (Vietos tab'e).
    if (!plan.usesLocations) {
      return NextResponse.json({
        locations: [],
        limits: { plan: plan.id, plan_name: plan.name, max_locations: plan.maxLocations, current: 0 },
      })
    }

    const { data, error } = await client
      .from('locations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let locations = (data || []) as LocationRow[]

    return NextResponse.json({
      locations,
      limits: { plan: plan.id, plan_name: plan.name, max_locations: plan.maxLocations, current: locations.length },
    })
  } catch (cause) {
    console.error('[api/locations] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** POST /api/locations — nauja vieta (tik Verslas planas, tikrinamas limitas). */
export async function POST(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan } = guard

  try {
    if (!plan.usesLocations) {
      return NextResponse.json({
        error: 'Jūsų planas nenaudoja vietų valdymo. Google Review nuoroda nustatoma skiltyje „Vietos“.',
      }, { status: 403 })
    }

    const body = await request.json() as { name?: string; address?: string; google_review_url?: string }
    const name = (body.name || '').trim() || 'Pagrindinė vieta'
    const address = (body.address || '').trim()
    const googleReviewUrl = normalizeGoogleReviewUrl(body.google_review_url)
    if (!googleReviewUrl) {
      return NextResponse.json({ error: 'Įrašykite Google Review nuorodą.' }, { status: 400 })
    }
    try {
      const parsed = new URL(googleReviewUrl)
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error()
    } catch {
      return NextResponse.json({ error: 'Neteisinga Google Review nuoroda.' }, { status: 400 })
    }

    const { count } = await client
      .from('locations')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (plan.maxLocations >= 0 && (count ?? 0) >= plan.maxLocations) {
      return NextResponse.json({
        error: `Jūsų „${plan.name}“ planas leidžia ${plan.maxLocations} ${plan.maxLocations === 1 ? 'vietą' : 'vietas'}. Norėdami pridėti daugiau vietų, atsinaujinkite planą.`,
      }, { status: 403 })
    }

    const { data, error } = await client
      .from('locations')
      .insert({ user_id: userId, name, address, google_review_url: googleReviewUrl })
      .select('*')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, location: data })
  } catch (cause) {
    console.error('[api/locations] POST nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** PATCH /api/locations — vietos redagavimas (tik Verslas planas). */
export async function PATCH(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan } = guard

  try {
    if (!plan.usesLocations) {
      return NextResponse.json({ error: 'Jūsų planas nenaudoja vietų valdymo.' }, { status: 403 })
    }

    const body = await request.json() as { id?: string; name?: string; address?: string; google_review_url?: string }
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updates: Record<string, string> = {}
    if (typeof body.name === 'string') updates.name = body.name.trim() || 'Pagrindinė vieta'
    if (typeof body.address === 'string') updates.address = body.address.trim()
    if (typeof body.google_review_url === 'string') {
      const googleReviewUrl = normalizeGoogleReviewUrl(body.google_review_url)
      if (!googleReviewUrl) return NextResponse.json({ error: 'Įrašykite Google Review nuorodą.' }, { status: 400 })
      updates.google_review_url = googleReviewUrl
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nėra keičiamų laukų.' }, { status: 400 })
    }

    const { data, error } = await client
      .from('locations')
      .update(updates)
      .eq('id', body.id)
      .eq('user_id', userId)
      .select('*')
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Vieta nerasta.' }, { status: 404 })
    return NextResponse.json({ ok: true, location: data })
  } catch (cause) {
    console.error('[api/locations] PATCH nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

/** DELETE /api/locations — vietos ištryninmas (QR kodai lieka, tik atsiejami). */
export async function DELETE(request: NextRequest) {
  const guard = await resolveTargetUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, plan } = guard

  try {
    if (!plan.usesLocations) {
      return NextResponse.json({ error: 'Jūsų planas nenaudoja vietų valdymo.' }, { status: 403 })
    }

    const body = await request.json() as { id?: string }
    if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    const { error } = await client
      .from('locations')
      .delete()
      .eq('id', body.id)
      .eq('user_id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (cause) {
    console.error('[api/locations] DELETE nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}