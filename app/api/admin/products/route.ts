import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'

function parseProductForm(formData: FormData) {
  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim()
  const price = Number(formData.get('price'))
  const active = String(formData.get('active') ?? 'true') === 'true'
  const sortOrder = Number(formData.get('sortOrder') || 0)
  return { name, description, price, active, sortOrder }
}

async function uploadProductImage(client: ReturnType<typeof import('@/lib/admin-auth').getServiceClient>, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null
  if (!file.type.startsWith('image/')) throw new Error('Įkelkite paveikslėlį.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Nuotrauka turi būti mažesnė nei 5 MB.')
  if (!client) throw new Error('Trūksta Supabase serverio konfigūracijos.')
  const extension = file.name.split('.').pop() || 'jpg'
  const path = `products/${crypto.randomUUID()}.${extension}`
  const { error } = await client.storage.from('store-products').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw new Error(error.message)
  return client.storage.from('store-products').getPublicUrl(path).data.publicUrl
}

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { data, error } = await guard.client.from('store_products').select('*').order('sort_order').order('created_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data || [] })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  try {
    const formData = await request.formData()
    const { name, description, price, active, sortOrder } = parseProductForm(formData)
    if (!name || !Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'Įrašykite produkto pavadinimą ir teisingą kainą.' }, { status: 400 })
    const imageUrl = await uploadProductImage(guard.client, formData.get('image'))
    const { data, error } = await guard.client.from('store_products').insert({ name, description, price_cents: Math.round(price * 100), active, sort_order: Math.round(sortOrder), image_url: imageUrl }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Produkto sukurti nepavyko.' }, { status: 400 })
  }
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  try {
    const formData = await request.formData()
    const id = String(formData.get('id') || '')
    const { name, description, price, active, sortOrder } = parseProductForm(formData)
    if (!id || !name || !Number.isFinite(price) || price <= 0) return NextResponse.json({ error: 'Trūksta produkto duomenų.' }, { status: 400 })
    const imageUrl = await uploadProductImage(guard.client, formData.get('image'))
    const update = { name, description, price_cents: Math.round(price * 100), active, sort_order: Math.round(sortOrder), ...(imageUrl ? { image_url: imageUrl } : {}) }
    const { data, error } = await guard.client.from('store_products').update(update).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ product: data })
  } catch (cause) {
    return NextResponse.json({ error: cause instanceof Error ? cause.message : 'Produkto išsaugoti nepavyko.' }, { status: 400 })
  }
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const body = await request.json() as { id?: string }
  if (!body.id) return NextResponse.json({ error: 'Trūksta produkto ID.' }, { status: 400 })
  const { error } = await guard.client.from('store_products').delete().eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
