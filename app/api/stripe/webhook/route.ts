import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getServiceClient } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

async function updateUserMetadata(userId: string, updates: Record<string, unknown>) {
  const adminClient = getServiceClient()
  if (!adminClient) throw new Error('Trūksta Supabase serverio konfigūracijos.')
  const { data, error } = await adminClient.auth.admin.getUserById(userId)
  if (error || !data.user) throw new Error(error?.message || 'Stripe vartotojas nerastas Supabase.')
  const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: { ...(data.user.user_metadata || {}), ...updates },
  })
  if (updateError) throw updateError
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) return NextResponse.json({ error: 'Stripe webhook konfigūracija nepilna.' }, { status: 400 })

  try {
    const stripe = getStripeClient()
    const event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const planId = session.metadata?.plan_id
      if (userId && planId) {
        let periodEnd = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString()
        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription)
          const currentPeriodEnd = subscription.items.data[0]?.current_period_end
          if (currentPeriodEnd) periodEnd = new Date(currentPeriodEnd * 1000).toISOString()
        }
        await updateUserMetadata(userId, {
          plan_id: planId,
          trial_end: periodEnd,
          stripe_customer_id: typeof session.customer === 'string' ? session.customer : null,
          stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
          subscription_status: 'active',
        })
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      const userId = subscription.metadata?.user_id
      const planId = subscription.metadata?.plan_id
      if (userId) {
        const currentPeriodEnd = subscription.items.data[0]?.current_period_end
        const periodEnd = currentPeriodEnd
          ? new Date(currentPeriodEnd * 1000).toISOString()
          : new Date(Date.now() - 60 * 1000).toISOString()
        await updateUserMetadata(userId, {
          ...(planId ? { plan_id: planId } : {}),
          trial_end: event.type === 'customer.subscription.deleted' ? new Date(Date.now() - 60 * 1000).toISOString() : periodEnd,
          subscription_status: subscription.status,
          stripe_subscription_id: subscription.id,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (cause) {
    console.error('[api/stripe/webhook] nepavyko:', cause)
    return NextResponse.json({ error: 'Webhook parašas arba apdorojimas neteisingas.' }, { status: 400 })
  }
}