import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

async function syncCompletedStoreOrders(client: NonNullable<Awaited<ReturnType<typeof requireAdmin>> & { ok: true }>['client']) {
  const stripe = getStripeClient()
  const sessions = await stripe.checkout.sessions.list({ limit: 100 })
  const completedStoreSessions = sessions.data.filter((session) => session.status === 'complete' && session.metadata?.store_product_id)

  for (const session of completedStoreSessions) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
    const lineItem = lineItems.data[0]
    const shipping = session.collected_information?.shipping_details
    const { error } = await client.from('store_orders').upsert({
      stripe_session_id: session.id,
      product_id: session.metadata?.store_product_id,
      product_name: lineItem?.description || 'Parduotuvės produktas',
      quantity: lineItem?.quantity || 1,
      amount_cents: session.amount_total || 0,
      customer_email: session.customer_details?.email || session.customer_email || null,
      shipping_name: shipping?.name || null,
      shipping_address: shipping?.address || null,
      status: session.payment_status || 'paid',
    }, { onConflict: 'stripe_session_id' })
    if (error) throw error
  }
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    await syncCompletedStoreOrders(guard.client)
  } catch (cause) {
    console.error('[api/admin/orders] Stripe užsakymų sinchronizacija nepavyko:', cause)
  }

  const { data, error } = await guard.client
    .from('store_orders')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ orders: data || [] })
}