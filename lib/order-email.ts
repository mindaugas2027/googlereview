type OrderEmail = {
  id: string
  productName: string
  quantity: number
  amountCents: number
  customerEmail: string
  shippingName: string | null
  shippingAddress: Record<string, string> | null
}

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[character] || character))

export async function sendOrderConfirmation(order: OrderEmail) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    console.warn('[order-email] RESEND_API_KEY arba RESEND_FROM_EMAIL nenustatytas.')
    return false
  }

  const address = order.shippingAddress
    ? [order.shippingAddress.line1, order.shippingAddress.line2, order.shippingAddress.postal_code, order.shippingAddress.city, order.shippingAddress.country].filter(Boolean).join(', ')
    : 'Adresas nepateiktas'
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [order.customerEmail],
      subject: `Gavome jūsų užsakymą #${order.id.slice(0, 8)}`,
      html: `<div style="font-family:Arial,sans-serif;color:#202124;max-width:600px"><h1>Užsakymas gautas</h1><p>Ačiū už jūsų pirkimą. Užsakymą pradėsime ruošti netrukus.</p><p><strong>Užsakymas:</strong> #${escapeHtml(order.id.slice(0, 8))}</p><p><strong>Prekė:</strong> ${escapeHtml(order.productName)}<br><strong>Kiekis:</strong> ${order.quantity}<br><strong>Suma:</strong> ${(order.amountCents / 100).toFixed(2).replace('.', ',')} €</p><p><strong>Pristatymas:</strong><br>${escapeHtml(order.shippingName || 'Vardas nepateiktas')}<br>${escapeHtml(address)}</p><p>Apie išsiuntimą informuosime atskirai.</p></div>`,
    }),
  })
  if (!response.ok) throw new Error(`Resend klaida (${response.status})`)
  return true
}