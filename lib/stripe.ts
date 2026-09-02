import Stripe from 'stripe'

let stripeClient: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error('Trūksta STRIPE_SECRET_KEY aplinkos kintamojo.')
  stripeClient ??= new Stripe(secretKey)
  return stripeClient
}

export function getStripePriceData(plan: { name: string; priceEur: number }) {
  return {
    currency: 'eur' as const,
    product_data: { name: `Getreview ${plan.name}` },
    unit_amount: Math.round(plan.priceEur * 100),
    recurring: { interval: 'month' as const },
  }
}