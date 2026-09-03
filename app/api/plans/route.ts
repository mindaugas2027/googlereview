import { NextRequest, NextResponse } from 'next/server'
import { requireServiceUser } from '@/lib/admin-auth'
import { getConfiguredPlanPrices } from '@/lib/plan-pricing'

export async function GET(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  try {
    return NextResponse.json({ prices: await getConfiguredPlanPrices(guard.client) })
  } catch (cause) {
    console.error('[api/plans] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Planų kainų įkelti nepavyko.' }, { status: 500 })
  }
}
