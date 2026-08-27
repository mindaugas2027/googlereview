import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, DAY_MS } from '@/lib/admin-auth'

type RouteContext = { params: Promise<{ userId: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const adminClient = guard.client

  try {
    const { userId } = await context.params

  const { data: target, error: userError } = await adminClient.auth.admin.getUserById(userId)
  if (userError || !target.user) return NextResponse.json({ error: userError?.message || 'User not found' }, { status: 404 })

  const [feedbackResult, scanResult] = await Promise.all([
    adminClient.from('feedbacks').select('id, name, rating, comment, sent_to_google, created_at').eq('user_id', userId).order('created_at', { ascending: false }),
    adminClient.from('qr_scans').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }),
  ])
  if (feedbackResult.error) return NextResponse.json({ error: feedbackResult.error.message }, { status: 500 })
  if (scanResult.error) return NextResponse.json({ error: scanResult.error.message }, { status: 500 })

  return NextResponse.json({
    user: {
      id: target.user.id,
      email: target.user.email,
      user_metadata: target.user.user_metadata || {},
    },
    feedbacks: feedbackResult.data || [],
    qr_scans: (scanResult.data || []).map((scan) => scan.created_at),
  })
  } catch (cause) {
    console.error('[api/admin/users/[userId]] GET nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const adminClient = guard.client

  try {
    const { userId } = await context.params
  const body = await request.json() as {
    action?: 'update_metadata' | 'delete_feedbacks' | 'renew_trial' | 'expire_trial' | 'change_password'
    metadata?: Record<string, unknown>
    password?: string
    days?: number
  }
  if (!body.action) return NextResponse.json({ error: 'Missing action' }, { status: 400 })

  const { data: target, error: getError } = await adminClient.auth.admin.getUserById(userId)
  if (getError || !target.user) return NextResponse.json({ error: getError?.message || 'User not found' }, { status: 404 })

  switch (body.action) {
    case 'update_metadata': {
      const allowedKeys = [
        'company_name', 'first_name', 'phone',
        'google_review_url', 'google_min_rating', 'logo_url', 'monthly_goal',
        'facebook_url', 'instagram_url', 'linkedin_url',
      ]
      const updates: Record<string, unknown> = {}
      for (const key of allowedKeys) {
        if (body.metadata && key in body.metadata) updates[key] = body.metadata[key]
      }
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { ...(target.user.user_metadata || {}), ...updates },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, user_metadata: data.user?.user_metadata })
    }
    case 'delete_feedbacks': {
      const { error } = await adminClient.from('feedbacks').delete().eq('user_id', userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    case 'renew_trial': {
      const days = Math.max(1, Math.min(3650, body.days || 14))
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { ...(target.user.user_metadata || {}), trial_end: new Date(Date.now() + days * DAY_MS).toISOString(), trial_started_at: new Date().toISOString(), trial_days: days },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, user_metadata: data.user?.user_metadata })
    }
    case 'expire_trial': {
      const expiredAt = new Date(Date.now() - 15 * DAY_MS).toISOString()
      const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
        user_metadata: { ...(target.user.user_metadata || {}), trial_end: expiredAt, trial_started_at: expiredAt },
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, user_metadata: data.user?.user_metadata })
    }
    case 'change_password': {
      const password = body.password || ''
      if (password.length < 6) return NextResponse.json({ error: 'Slaptažodis turi būti bent 6 simbolių.' }, { status: 400 })
      const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
  } catch (cause) {
    console.error('[api/admin/users/[userId]] PATCH nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const adminClient = guard.client

  try {
    const { userId } = await context.params

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Nerasta logotipo bylos.' }, { status: 400 })
  if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Įkelkite paveikslėlį.' }, { status: 400 })
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Logotipas turi būti mažesnis nei 2 MB.' }, { status: 400 })

  const extension = file.name.split('.').pop() || 'png'
  const path = `${userId}/logo-${Date.now()}.${extension}`
  const { error: uploadError } = await adminClient.storage.from('logos').upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
  const { data } = adminClient.storage.from('logos').getPublicUrl(path)

  const { data: target, error: getError } = await adminClient.auth.admin.getUserById(userId)
  if (getError || !target.user) return NextResponse.json({ error: getError?.message || 'User not found' }, { status: 404 })
  const { error: metaError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...(target.user.user_metadata || {}), logo_url: data.publicUrl },
  })
  if (metaError) return NextResponse.json({ error: metaError.message }, { status: 500 })

  return NextResponse.json({ ok: true, logo_url: data.publicUrl })
  } catch (cause) {
    console.error('[api/admin/users/[userId]] POST nepavyko:', cause)
    return NextResponse.json({ error: 'Netikėta serverio klaida.' }, { status: 500 })
  }

}