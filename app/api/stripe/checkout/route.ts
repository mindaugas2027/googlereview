import { NextRequest, NextResponse } from 'next/server'
import { getPlan, type PlanId } from '@/lib/plans'
import { requireServiceUser } from '@/lib/admin-auth'
import { getStripeClient, getStripePriceData } from '@/lib/stripe'
import { getConfiguredPlanPrices, getPlanWithPrice } from '@/lib/plan-pricing'

export async function POST(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const body = await request.json() as { planId?: string }
    if (!body.planId || !['startas', 'pro', 'verslas'].includes(body.planId)) {
      return NextResponse.json({ error: 'Nežinomas planas.' }, { status: 400 })
    }

    const plan = getPlanWithPrice(getPlan(body.planId as PlanId), await getConfiguredPlanPrices(guard.client))
    const stripe = getStripeClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: guard.userEmail || undefined,
      line_items: [{ price_data: getStripePriceData(plan), quantity: 1 }],
      metadata: { user_id: guard.userId, plan_id: plan.id },
      subscription_data: { metadata: { user_id: guard.userId, plan_id: plan.id } },
      success_url: `${origin}/dashboard?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?stripe=cancelled`,
      allow_promotion_codes: true,
    })

    if (!session.url) return NextResponse.json({ error: 'Stripe nesugeneravo apmokėjimo nuorodos.' }, { status: 502 })
    return NextResponse.json({ url: session.url })
  } catch (cause) {
    console.error('[api/stripe/checkout] nepavyko:', cause)
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Nepavyko pradėti apmokėjimo.' }, { status: 500 })
  }
}