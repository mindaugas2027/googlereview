import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getTrialEndMs, DAY_MS } from '@/lib/admin-auth'
import { readOrInitStats } from '@/lib/stats'

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
      users.push(...data.users.map((user) => ({
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

    // Inkrementiniai skaitikliai iš business_stats (viena partija), o vartotojams
    // be eilutės — savęs atkūrimas per readOrInitStats (retas atvejis).
    const statsResult = userIds.length
      ? await adminClient.from('business_stats').select('user_id, total_feedbacks, google_redirects, rating_sum, total_qr_scans').in('user_id', userIds)
      : { data: [], error: null }
    if (statsResult.error) return NextResponse.json({ error: statsResult.error.message }, { status: 500 })
    type StatsRow = { user_id: string; total_feedbacks?: number; google_redirects?: number; rating_sum?: number; total_qr_scans?: number }
    const statsByUser = new Map<string, { total_feedbacks: number; google_redirects: number; rating_sum: number; total_qr_scans: number }>()
    for (const row of (statsResult.data || []) as StatsRow[]) {
      statsByUser.set(String(row.user_id), {
        total_feedbacks: Number(row.total_feedbacks) || 0,
        google_redirects: Number(row.google_redirects) || 0,
        rating_sum: Number(row.rating_sum) || 0,
        total_qr_scans: Number(row.total_qr_scans) || 0,
      })
    }
    const missingIds = userIds.filter((id) => !statsByUser.has(id))
    for (const id of missingIds) {
      const stats = await readOrInitStats(adminClient, id)
      statsByUser.set(id, {
        total_feedbacks: stats.total_feedbacks,
        google_redirects: stats.google_redirects,
        rating_sum: stats.rating_sum,
        total_qr_scans: stats.total_qr_scans,
      })
    }

    return NextResponse.json({
      users: users.map((user) => {
        const stats = statsByUser.get(String(user.id)) || { total_feedbacks: 0, google_redirects: 0, rating_sum: 0, total_qr_scans: 0 }
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

