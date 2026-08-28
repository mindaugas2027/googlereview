import { NextRequest, NextResponse } from 'next/server'
import { canAccessBusiness, requireServiceUser } from '@/lib/admin-auth'
import { readOrInitStats } from '@/lib/stats'

export const dynamic = 'force-dynamic'

/**
 * GET /api/stats?business=<uuid>
 * Grąžina inkrementinius skaitiklius (business_stats), kuriuos palaiko
 * Supabase trigger'iai. Jei eilutės dar nėra — sukuria ją (savęs atkūrimas).
 * Pasiekia savo skaitiklius; administratorius — bet kuriuo ?business= parametru.
 */
export async function GET(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, userEmail } = guard

  try {
    const businessId = request.nextUrl.searchParams.get('business')?.trim() || userId
    if (!canAccessBusiness(businessId, userId, userEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await readOrInitStats(client, businessId)
    return NextResponse.json({ stats })
  } catch (cause) {
    console.error('[api/stats] GET nepavyko:', cause)
    const message = cause instanceof Error ? cause.message : 'Netikėta serverio klaida.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
