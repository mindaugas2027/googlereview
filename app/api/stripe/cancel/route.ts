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

    let trialEnd = typeof metadata.trial_end === 'string' ? metadata.trial_end : null
    if (subscriptionId) {
      const stripe = getStripeClient()
      const subscription = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true })
      const currentPeriodEnd = subscription.items.data[0]?.current_period_end
      if (currentPeriodEnd) trialEnd = new Date(currentPeriodEnd * 1000).toISOString()
    }

    const { error: updateError } = await adminClient.auth.admin.updateUserById(guard.userId, {
      user_metadata: {
        ...metadata,
        cancel_at_period_end: true,
        subscription_status: subscriptionId ? 'active' : 'trial_cancelled',
        ...(trialEnd ? { trial_end: trialEnd } : {}),
      },
    })
    if (updateError) throw updateError

    return NextResponse.json({ ok: true, cancel_at_period_end: true, trial_end: trialEnd })
  } catch (cause) {
    console.error('[api/stripe/cancel] nepavyko:', cause)
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Prenumeratos atšaukti nepavyko.' }, { status: 500 })
  }
}
