'use client'

import { useState } from 'react'
import { ArrowRight, Loader2, ShoppingBag } from 'lucide-react'

type StoreProduct = {
  id: string
  name: string
  description: string
  image_url: string | null
  price_cents: number
}

export function StoreProductCard({ product }: { product: StoreProduct }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const startCheckout = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/stripe/store-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.url) {
        setError(payload?.error || 'Apmokėjimo pradėti nepavyko.')
        return
      }
      window.location.assign(payload.url)
    } catch {
      setError('Nepavyko pasiekti mokėjimo. Bandykite dar kartą.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <article className="bg-white border border-[#dadce0] rounded-2xl overflow-hidden shadow-sm flex flex-col">
      <div className="aspect-[4/3] bg-[#eef3f8] overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full grid place-items-center text-[#1a73e8]"><ShoppingBag size={42} /></div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-xl">{product.name}</h3>
        {product.description && <p className="text-sm text-[#5f6368] mt-2 flex-1">{product.description}</p>}
        <div className="flex items-center justify-between gap-3 mt-5">
          <strong className="text-2xl">{(product.price_cents / 100).toFixed(2).replace('.', ',')} €</strong>
          <button type="button" onClick={startCheckout} disabled={loading} className="bg-[#1a73e8] hover:bg-[#1769d1] disabled:opacity-60 text-white rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            Pirkti
          </button>
        </div>
        {error && <p className="text-xs text-[#c5221f] mt-3">{error}</p>}
      </div>
    </article>
  )
}
