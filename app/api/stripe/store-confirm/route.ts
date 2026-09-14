import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id')
  if (!sessionId) return NextResponse.json({ error: 'Trūksta Stripe sesijos.' }, { status: 400 })

  try {
    const stripe = getStripeClient()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    const productId = session.metadata?.store_product_id
    if (!productId || session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Mokėjimas dar nepatvirtintas.' }, { status: 409 })
    }

    const client = getServiceClient()
    if (!client) return NextResponse.json({ error: 'Mokėjimo konfigūracija nepilna.' }, { status: 500 })
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
    const lineItem = lineItems.data[0]
    const shipping = session.collected_information?.shipping_details
    const { error } = await client.from('store_orders').upsert({
      stripe_session_id: session.id,
      product_id: productId,
      product_name: lineItem?.description || 'Parduotuvės produktas',
      quantity: lineItem?.quantity || 1,
      amount_cents: session.amount_total || 0,
      customer_email: session.customer_details?.email || session.customer_email || null,
      shipping_name: shipping?.name || null,
      shipping_address: shipping?.address || null,
      status: 'paid',
    }, { onConflict: 'stripe_session_id' })
    if (error) throw error

    return NextResponse.json({ confirmed: true })
  } catch (cause) {
    console.error('[api/stripe/store-confirm] nepavyko:', cause)
    return NextResponse.json({ error: 'Nepavyko patvirtinti užsakymo.' }, { status: 500 })
  }
}