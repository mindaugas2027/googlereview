import { NextRequest, NextResponse } from 'next/server'
import { requireServiceUser } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Trūksta Stripe sesijos.' }, { status: 400 })

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const userId = session.metadata?.user_id
    const planId = session.metadata?.plan_id
    if (userId !== guard.userId || !planId || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Prenumeratos mokėjimas nepatvirtintas.' }, { status: 409 })
    }

    if (typeof session.subscription !== 'string') {
      return NextResponse.json({ error: 'Stripe prenumerata nerasta.' }, { status: 409 })
    }
    const subscription = await stripe.subscriptions.retrieve(session.subscription)
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end
    const trialEnd = currentPeriodEnd
      ? new Date(currentPeriodEnd * 1000).toISOString()
      : new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await guard.client.auth.admin.getUserById(guard.userId)
    if (error || !data.user) throw new Error(error?.message || 'Vartotojas nerastas.')
    const metadata = {
      ...(data.user.user_metadata || {}),
      plan_id: planId,
      trial_end: trialEnd,
      stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
    }
    const { error: updateError } = await guard.client.auth.admin.updateUserById(guard.userId, { user_metadata: metadata })
    if (updateError) throw updateError
    return NextResponse.json({ metadata })
  } catch (cause) {
    console.error('[api/stripe/confirm] nepavyko:', cause)
    return NextResponse.json({ error: 'Nepavyko patvirtinti prenumeratos.' }, { status: 500 })
  }
}