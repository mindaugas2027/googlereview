import { NextRequest, NextResponse } from 'next/server'
import { requireServiceUser, getServiceClient } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const adminClient = getServiceClient()
    if (!adminClient) throw new Error('Trūksta Supabase serverio konfigūracijos.')

    const { data, error } = await adminClient.auth.admin.getUserById(guard.userId)
    if (error || !data.user) throw new Error(error?.message || 'Vartotojas nerastas.')

    const metadata = data.user.user_metadata || {}
    const subscriptionId = typeof metadata.stripe_subscription_id === 'string'
      ? metadata.stripe_subscription_id
      : null

    if (subscriptionId) {
      const stripe = getStripeClient()
      await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(guard.userId, {
      user_metadata: {
        ...metadata,
        cancel_at_period_end: true,
        subscription_status: subscriptionId ? 'active' : 'trial_cancelled',
      },
    })
    if (updateError) throw updateError

    return NextResponse.json({ ok: true, cancel_at_period_end: true })
  } catch (cause) {
    console.error('[api/stripe/cancel] nepavyko:', cause)
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Prenumeratos atšaukti nepavyko.' }, { status: 500 })
  }
}
