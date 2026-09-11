import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin-auth'
import { getStripeClient } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { productId?: string; quantity?: number }
    if (!body.productId) return NextResponse.json({ error: 'Nepasirinktas produktas.' }, { status: 400 })
    const quantity = Number(body.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: 'Pasirinkite kiekį nuo 1 iki 100 vnt.' }, { status: 400 })
    }
    const client = getServiceClient()
    if (!client) return NextResponse.json({ error: 'Mokėjimo konfigūracija nepilna.' }, { status: 500 })
    const { data: product, error } = await client.from('store_products').select('id, name, description, image_url, price_cents').eq('id', body.productId).eq('active', true).single()
    if (error || !product) return NextResponse.json({ error: 'Produktas nerastas arba nebeparduodamas.' }, { status: 404 })

    const stripe = getStripeClient()
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity,
        price_data: {
          currency: 'eur',
          unit_amount: product.price_cents,
          product_data: { name: product.name, description: product.description || undefined, images: product.image_url ? [product.image_url] : undefined },
        },
      }],
      shipping_address_collection: { allowed_countries: ['LT', 'LV', 'EE', 'PL', 'DE'] },
      metadata: { store_product_id: product.id },
      success_url: `${origin}/?store=success`,
      cancel_url: `${origin}/?store=cancelled`,
      allow_promotion_codes: true,
    })
    if (!session.url) return NextResponse.json({ error: 'Stripe nesugeneravo apmokėjimo nuorodos.' }, { status: 502 })
    return NextResponse.json({ url: session.url })
  } catch (cause) {
    console.error('[api/stripe/store-checkout] nepavyko:', cause)
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Nepavyko pradėti apmokėjimo.' }, { status: 500 })
  }
}
