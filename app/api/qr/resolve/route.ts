import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin-auth'
import { normalizeGoogleReviewUrl } from '@/lib/api-helpers'
import { getPlan } from '@/lib/plans'

export const dynamic = 'force-dynamic'

type ResolveRow = {
  id: string
  label: string
  location_id: string | null
  locations?: { name?: string; google_review_url?: string } | null
}

/**
 * GET /api/qr/resolve?business=<id>&qr=<qrCodeId>
 * Viešas (anon) maršrutas QR nuskaitymui: pagal QR kodą nustato Google Review
 * nuorodą (QR vietos → pirma vieta → metadata), logotipą ir slenkstį bei
 * užregistruoja nuskaitymą su QR / vietos nuorodomis.
 */
export async function GET(request: NextRequest) {
  const client = getServiceClient()
  if (!client) {
    return NextResponse.json({ error: 'Serverio konfigūracija nepilna (SUPABASE_SERVICE_ROLE_KEY).' }, { status: 500 })
  }

  const businessId = request.nextUrl.searchParams.get('business')?.trim() || ''
  const qrId = request.nextUrl.searchParams.get('qr')?.trim() || ''
  if (!businessId) {
    return NextResponse.json({ error: 'Missing business' }, { status: 400 })
  }

  try {
    const { data: target, error: targetError } = await client.auth.admin.getUserById(businessId)
    if (targetError || !target.user) {
      return NextResponse.json({ error: 'Naudotojas nerastas.' }, { status: 404 })
    }
    const metadata = (target.user.user_metadata || {}) as Record<string, unknown>

    // QR kodas ir jo vieta
    let qr: ResolveRow | null = null
    if (qrId) {
      const { data } = await client
        .from('qr_codes')
        .select('id, label, location_id, locations(name, google_review_url)')
        .eq('id', qrId)
        .eq('user_id', businessId)
        .maybeSingle()
      qr = (data || null) as ResolveRow | null
    }

    // Vietų sistema tik Verslas planui — kitiems planams Google URL visada
    // imamas iš metadata (sena „Vietos“ tab'ą elgsena), vietos ignoruojamos.
    const usesLocations = getPlan(metadata.plan_id).usesLocations

    // Atsarginė nuoroda: pirma vartotojo vieta (tik vietų sistemai)
    let firstLocationUrl = ''
    let firstLocationId: string | null = null
    if (qrId && usesLocations) {
      const { data: locationRows } = await client
        .from('locations')
        .select('id, google_review_url')
        .eq('user_id', businessId)
        .order('created_at')
        .limit(1)
      firstLocationUrl = locationRows?.[0]?.google_review_url || ''
      firstLocationId = locationRows?.[0]?.id ?? null
    }

    const googleReviewUrl = normalizeGoogleReviewUrl(
      (usesLocations ? qr?.locations?.google_review_url || firstLocationUrl : '') || metadata.google_review_url,
    )

    // Nuskaitymo fiksavimas (su QR / vietos nuorodomis, kai žinomos)
    const { error: scanError } = await client.from('qr_scans').insert({
      user_id: businessId,
      qr_code_id: qr?.id ?? (qrId || null),
      location_id: qr?.location_id ?? firstLocationId,
    })
    if (scanError) console.error('[api/qr/resolve] Nuskaitymo užfiksuoti nepavyko:', scanError.message)

    return NextResponse.json({
      google_review_url: googleReviewUrl,
      google_min_rating: Number(metadata.google_min_rating) || 4,
      logo_url: typeof metadata.logo_url === 'string' ? metadata.logo_url : '',
      company_name: typeof metadata.company_name === 'string' ? metadata.company_name : '',
      qr_label: qr?.label || '',
      location_name: qr?.locations?.name || '',
      location_id: qr?.location_id ?? firstLocationId,
      qr_code_id: qr?.id ?? null,
    })
  } catch (cause) {
    console.error('[api/qr/resolve] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}
