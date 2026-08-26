import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'mindaugas2027@gmail.com'

const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const requireAdmin = async (request: NextRequest) => {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const adminClient = getAdminClient()
  const { data: { user } } = await adminClient.auth.getUser(token)
  if (!user || user.email?.toLowerCase() !== ADMIN_EMAIL) return null
  return adminClient
}

export async function GET(request: NextRequest) {
  const adminClient = await requireAdmin(request)
  if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      monthly_goal: user.user_metadata?.monthly_goal || 60,
    })))
    hasMore = data.users.length === 1000
    page += 1
  }

  const userIds = users.map((user) => user.id)
  const [feedbackResult, scanResult] = await Promise.all([
    userIds.length ? adminClient.from('feedbacks').select('user_id, rating, sent_to_google, comment, name, created_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? adminClient.from('qr_scans').select('user_id, created_at').in('user_id', userIds) : Promise.resolve({ data: [], error: null }),
  ])
  if (feedbackResult.error) return NextResponse.json({ error: feedbackResult.error.message }, { status: 500 })
  if (scanResult.error) return NextResponse.json({ error: scanResult.error.message }, { status: 500 })

  return NextResponse.json({
    users: users.map((user) => {
      const feedbacks = (feedbackResult.data || []).filter((feedback) => feedback.user_id === user.id)
      const scans = (scanResult.data || []).filter((scan) => scan.user_id === user.id)
      return {
        ...user,
        feedback_count: feedbacks.length,
        google_redirects: feedbacks.filter((feedback) => feedback.sent_to_google).length,
        qr_scans: scans.length,
        average_rating: feedbacks.length ? Number((feedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / feedbacks.length).toFixed(1)) : null,
        recent_feedbacks: feedbacks.slice(0, 5),
      }
    }),
  })
}

export async function PATCH(request: NextRequest) {
  const adminClient = await requireAdmin(request)
  if (!adminClient) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json() as { userId?: string; action?: 'extend_trial' | 'expire_trial' | 'delete_user'; days?: number }
  if (!body.userId || !body.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  if (body.action === 'delete_user') {
    const { error } = await adminClient.auth.admin.deleteUser(body.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'expire_trial') {
    const expiredAt = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
    const { data: target, error: getError } = await adminClient.auth.admin.getUserById(body.userId)
    if (getError || !target.user) return NextResponse.json({ error: getError?.message || 'User not found' }, { status: 404 })
    const { error } = await adminClient.auth.admin.updateUserById(body.userId, {
      user_metadata: { ...target.user.user_metadata, trial_started_at: expiredAt },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const days = Math.max(1, Math.min(3650, body.days || 14))
  const { data: target, error: getError } = await adminClient.auth.admin.getUserById(body.userId)
  if (getError || !target.user) return NextResponse.json({ error: getError?.message || 'User not found' }, { status: 404 })
  const { data, error } = await adminClient.auth.admin.updateUserById(body.userId, {
    user_metadata: { ...target.user.user_metadata, trial_started_at: new Date().toISOString(), trial_days: days },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, user: data.user })
}
