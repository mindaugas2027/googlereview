import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/admin-auth'

export async function GET() {
  const client = getServiceClient()
  if (!client) return NextResponse.json({ error: 'Parduotuvės konfigūracija nepilna.' }, { status: 500 })

  const { data, error } = await client
    .from('store_products')
    .select('id, name, description, image_url, price_cents')
    .eq('active', true)
    .order('sort_order')
    .order('created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}