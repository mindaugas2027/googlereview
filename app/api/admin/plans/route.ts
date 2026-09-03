import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getConfiguredPlanPrices, normalizePlanPrices } from '@/lib/plan-pricing'
import { ADMIN_EMAIL } from '@/lib/admin-auth'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  try {
    return NextResponse.json({ prices: await getConfiguredPlanPrices(guard.client) })
  } catch (cause) {
    console.error('[api/admin/plans] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Kainų įkelti nepavyko.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  try {
    const body = await request.json() as { prices?: unknown }
    const prices = normalizePlanPrices(body.prices)
    const { data, error } = await guard.client.auth.admin.listUsers({ page: 1, perPage: 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    const adminUser = data.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL)
    if (!adminUser) return NextResponse.json({ error: 'Administratoriaus paskyra nerasta.' }, { status: 404 })
    const { error: updateError } = await guard.client.auth.admin.updateUserById(adminUser.id, {
      user_metadata: { ...(adminUser.user_metadata || {}), plan_prices: prices },
    })
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true, prices })
  } catch (cause) {
    console.error('[api/admin/plans] PATCH nepavyko:', cause)
    return NextResponse.json({ error: 'Kainų išsaugoti nepavyko.' }, { status: 500 })
  }
}
