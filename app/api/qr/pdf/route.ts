import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import { canAccessBusiness, requireServiceUser } from '@/lib/admin-auth'
import { generatePrintReadyPdf, QR_TEMPLATE_FILENAME } from '@/lib/generatePdf'

export const dynamic = 'force-dynamic'

/** Sujungia aplikacijos origin (svetainės adresą), kad QR rodytų į viešą įvertinimo puslapį. */
function resolveOrigin(request: NextRequest): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  const forwardedHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]
    ?? request.nextUrl.protocol.replace(/:$/, '')
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`
  return request.nextUrl.origin
}

const normalizeGoogleReviewUrl = (value: string) => {
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

/** Perskaito PDF šabloną: pirmiausia iš disko, o jei neįmanoma (pvz., serverless) — per viešą statinį URL. */
async function loadTemplate(request: NextRequest): Promise<Uint8Array> {
  try {
    return await readFile(/*turbopackIgnore: true*/ path.join(process.cwd(), 'public', QR_TEMPLATE_FILENAME))
  } catch {
    // diske nerasta — bandome per viešą statinį URL
  }
  try {
    const response = await fetch(new URL(`/${QR_TEMPLATE_FILENAME}`, resolveOrigin(request)))
    if (response.ok) return new Uint8Array(await response.arrayBuffer())
  } catch {
    // nukrentame į klaidą žemiau
  }
  throw new Error(`Nerastas PDF šablonas „public/${QR_TEMPLATE_FILENAME}".`)
}

export async function GET(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, userEmail } = guard

  try {
    // Kliento ID: savo QR — pagal nutylėjimą; admin peržiūroje (view_as) — ?business=<klientoId>
    const businessId = request.nextUrl.searchParams.get('business')?.trim() || userId
    if (!canAccessBusiness(businessId, userId, userEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Konkretus QR kodas (?qr=<id>) — naujojo sąrašo kodams
    const qrId = request.nextUrl.searchParams.get('qr')?.trim() || ''

    const { data: target, error: targetError } = await client.auth.admin.getUserById(businessId)
    if (targetError || !target.user) {
      return NextResponse.json({ error: 'Naudotojas nerastas.' }, { status: 404 })
    }

    let reviewUrl: string
    if (qrId) {
      // QR kodas turi priklausyti tam pačiam vartotojui
      const { data: qrRow } = await client
        .from('qr_codes')
        .select('id')
        .eq('id', qrId)
        .eq('user_id', target.user.id)
        .single()
      if (!qrRow) {
        return NextResponse.json({ error: 'QR kodas nerastas.' }, { status: 404 })
      }
      // Naujojo formato URL: konfigūraciją (Google URL, slenkstį, logotipą) /review
      // puslapis pasiima per /api/qr/resolve — nuoroda trumpa ir stabili.
      reviewUrl = `${resolveOrigin(request)}/review?business=${encodeURIComponent(target.user.id)}&qr=${encodeURIComponent(qrId)}`
    } else {
      const meta = (target.user.user_metadata || {}) as Record<string, unknown>
      const googleReviewUrl = typeof meta.google_review_url === 'string' && meta.google_review_url.trim()
        ? normalizeGoogleReviewUrl(meta.google_review_url)
        : ''
      if (!googleReviewUrl) {
        return NextResponse.json({ error: 'Pirmiausia pridėkite Google Review URL skiltyje „Vietos".' }, { status: 400 })
      }
      const logoUrl = typeof meta.logo_url === 'string' ? meta.logo_url : ''
      const threshold = Number(meta.google_min_rating) || 4

      // URL identiškas tam, kurį koduoja valdymo panelės QR kodas (app/dashboard/page.tsx — reviewUrl)
      reviewUrl = `${resolveOrigin(request)}/review?business=${encodeURIComponent(target.user.id)}&google=${encodeURIComponent(googleReviewUrl)}&threshold=${threshold}&logo=${encodeURIComponent(logoUrl)}`
    }

    const templatePdf = await loadTemplate(request)
    const pdfBytes = await generatePrintReadyPdf({ templatePdf, reviewUrl })

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="getreview-qr-spaudai.pdf"',
        'Cache-Control': 'no-store',
      },
    })
  } catch (cause) {
    console.error('[api/qr/pdf] GET nepavyko:', cause)
    const message = cause instanceof Error ? cause.message : 'Netikėta serverio klaida.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
