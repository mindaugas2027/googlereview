import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getTrialEndMs, DAY_MS, ADMIN_EMAIL } from '@/lib/admin-auth'
import { readStatsForUsers, EMPTY_STATS } from '@/lib/stats'

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const adminClient = guard.client

  try {
    const users: Array<Record<string, unknown>> = []
    let page = 1
    let hasMore = true
    while (hasMore) {
      const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      // Admino paskyra sąraše nerodoma — ji nėra klientas (admin, jei reikia, susikuria atskirą vartotoją).
      users.push(...data.users
        .filter((user) => user.email?.toLowerCase() !== ADMIN_EMAIL)
        .map((user) => ({
          id: user.id,
          email: user.email,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          company_name: user.user_metadata?.company_name || 'Nenurodyta',
          first_name: user.user_metadata?.first_name || 'Nenurodyta',
          trial_started_at: user.user_metadata?.trial_started_at || null,
          trial_end: user.user_metadata?.trial_end || null,
          trial_days: user.user_metadata?.trial_days || null,
          monthly_goal: user.user_metadata?.monthly_goal || 60,
        })))
      hasMore = data.users.length === 1000
      page += 1
    }

    const userIds = users.map((user) => String(user.id))

    // Inkrementiniai skaitikliai: masine business_stats užklausa, o jei lentelės
    // dar nėra (migracija nepaleista) — automatiškai skaičiuojama tiesiogiai.
    const statsByUser = await readStatsForUsers(adminClient, userIds)

    return NextResponse.json({
      users: users.map((user) => {
        const userStats = statsByUser.get(String(user.id))
        const stats = userStats || EMPTY_STATS
        return {
          ...user,
          feedback_count: Number(stats.total_feedbacks) || 0,
          google_redirects: Number(stats.google_redirects) || 0,
          qr_scans: Number(stats.total_qr_scans) || 0,
          average_rating: Number(stats.total_feedbacks) > 0
            ? Number((Number(stats.rating_sum) / Number(stats.total_feedbacks)).toFixed(1))
            : null,
        }
      }),
    })
  } catch (cause) {
    console.error('[api/admin/users] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const adminClient = guard.client

  try {
    const body = await request.json() as { userId?: string; action?: 'extend_trial' | 'expire_trial' | 'delete_user'; days?: number; endDate?: string }
    if (!body.userId || !body.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })
    const { data: target, error: getError } = await adminClient.auth.admin.getUserById(body.userId)
    if (getError || !target.user) return NextResponse.json({ error: getError?.message || 'User not found' }, { status: 404 })

    if (body.action === 'delete_user') {
      const { error } = await adminClient.auth.admin.deleteUser(body.userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'expire_trial') {
      const expiredAt = new Date(Date.now() - 15 * DAY_MS).toISOString()
      const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
        user_metadata: { ...target.user.user_metadata, trial_end: expiredAt, trial_started_at: expiredAt },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    // extend_trial: arba nustatoma konkreti galiojimo iki data (endDate), arba pridedama dienų (days)
    let newEndMs: number
    if (body.endDate) {
      const parsed = new Date(`${body.endDate}T23:59:59`)
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: 'Neteisinga data. Naudokite YYYY-MM-DD formatą.' }, { status: 400 })
      }
      newEndMs = parsed.getTime()
    } else {
      const days = Math.max(1, Math.min(3650, body.days || 30))
      const baseMs = getTrialEndMs(target.user.user_metadata)
      newEndMs = (baseMs > Date.now() ? baseMs : Date.now()) + days * DAY_MS
    }

    const { data, error } = await adminClient.auth.admin.updateUserById(body.userId, {
      user_metadata: { ...target.user.user_metadata, trial_end: new Date(newEndMs).toISOString() },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, user: data.user })
  } catch (cause) {
    console.error('[api/admin/users] PATCH nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

