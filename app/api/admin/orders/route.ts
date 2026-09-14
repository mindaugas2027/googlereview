import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

async function syncCompletedStoreOrders(client: SupabaseClient) {
  const stripe = getStripeClient()
  const sessions = await stripe.checkout.sessions.list({ limit: 100 })
  const completedStoreSessions = sessions.data.filter((session) => session.status === 'complete' && session.metadata?.store_product_id)

  for (const session of completedStoreSessions) {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 })
    const lineItem = lineItems.data[0]
    const shipping = session.collected_information?.shipping_details
    const { data: existingOrder } = await client
      .from('store_orders')
      .select('status')
      .eq('stripe_session_id', session.id)
      .maybeSingle()
    const { error } = await client.from('store_orders').upsert({
      stripe_session_id: session.id,
      product_id: session.metadata?.store_product_id,
      product_name: lineItem?.description || 'Parduotuvės produktas',
      quantity: lineItem?.quantity || 1,
      amount_cents: session.amount_total || 0,
      customer_email: session.customer_details?.email || session.customer_email || null,
      shipping_name: shipping?.name || null,
      shipping_address: shipping?.address || null,
      status: existingOrder?.status === 'shipped' || existingOrder?.status === 'refunded'
        ? existingOrder.status
        : session.payment_status || 'paid',
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

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const body = await request.json().catch(() => null) as { orderId?: string; action?: 'ship' | 'refund' } | null
  if (!body?.orderId || !body.action) return NextResponse.json({ error: 'Trūksta užsakymo veiksmo.' }, { status: 400 })

  const { data: order, error: orderError } = await guard.client
    .from('store_orders')
    .select('id, stripe_session_id, status')
    .eq('id', body.orderId)
    .single()
  if (orderError || !order) return NextResponse.json({ error: 'Užsakymas nerastas.' }, { status: 404 })

  if (body.action === 'ship') {
    if (order.status === 'refunded') return NextResponse.json({ error: 'Grąžinto užsakymo išsiųsti negalima.' }, { status: 409 })
    const { data, error } = await guard.client.from('store_orders').update({ status: 'shipped' }).eq('id', order.id).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ order: data })
  }

  if (order.status === 'refunded') return NextResponse.json({ error: 'Šis užsakymas jau grąžintas.' }, { status: 409 })
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id)
  if (typeof session.payment_intent !== 'string') return NextResponse.json({ error: 'Stripe mokėjimo nepavyko rasti.' }, { status: 409 })
  await stripe.refunds.create({ payment_intent: session.payment_intent })
  const { data, error } = await guard.client.from('store_orders').update({ status: 'refunded' }).eq('id', order.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ order: data })
}