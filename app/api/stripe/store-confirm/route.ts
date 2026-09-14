import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'
import { sendOrderConfirmation } from '@/lib/order-email'

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
    const { data: order, error } = await client.from('store_orders').upsert({
      stripe_session_id: session.id,
      product_id: productId,
      product_name: lineItem?.description || 'Parduotuvės produktas',
      quantity: lineItem?.quantity || 1,
      amount_cents: session.amount_total || 0,
      customer_email: session.customer_details?.email || session.customer_email || null,
      shipping_name: shipping?.name || null,
      shipping_address: shipping?.address || null,
      status: 'paid',
    }, { onConflict: 'stripe_session_id' }).select('*').single()
    if (error) throw error

    const customerEmail = session.customer_details?.email || session.customer_email
    if (customerEmail && !order.confirmation_email_sent_at) {
      try {
        if (await sendOrderConfirmation({
          id: order.id,
          productName: order.product_name,
          quantity: order.quantity,
          amountCents: order.amount_cents,
          customerEmail,
          shippingName: order.shipping_name,
          shippingAddress: order.shipping_address,
        })) {
          await client.from('store_orders').update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', order.id)
        }
      } catch (emailError) {
        console.error('[api/stripe/store-confirm] patvirtinimo laiško išsiųsti nepavyko:', emailError)
      }
    }

    return NextResponse.json({ confirmed: true })
  } catch (cause) {
    console.error('[api/stripe/store-confirm] nepavyko:', cause)
    return NextResponse.json({ error: 'Nepavyko patvirtinti užsakymo.' }, { status: 500 })
  }
}