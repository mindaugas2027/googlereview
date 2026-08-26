'use client'

import { useState } from 'react'
import { Star, Sparkles, Send, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const businessId = params?.get('business') || ''
  const rawGoogleUrl = params?.get('google') || ''
  const googleUrl = rawGoogleUrl && !/^https?:\/\//i.test(rawGoogleUrl) ? `https://${rawGoogleUrl}` : rawGoogleUrl
  const logoUrl = params?.get('logo') || ''
  const googleThreshold = Math.min(5, Math.max(1, Number(params?.get('threshold')) || 4))
  const isPositive = rating >= googleThreshold
  let destinationHostname = ''
  try {
    destinationHostname = googleUrl ? new URL(googleUrl).hostname : ''
  } catch {
    destinationHostname = ''
  }
  const isGoogleDestination = /(^|\.)google\.[^/]+$/i.test(destinationHostname) || destinationHostname === 'g.page'

  const recordGoogleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    if (!businessId || !googleUrl) return
    const { error: insertError } = await supabase.from('feedbacks').insert({
      user_id: businessId,
      name: name.trim() || 'Anoniminis klientas',
      rating,
      comment: 'Klientas nukreiptas į Google Review.',
      sent_to_google: isGoogleDestination,
      created_at: new Date().toISOString(),
    })
    if (insertError) {
      setError(`Google nukreipimo nepavyko užregistruoti: ${insertError.message}`)
      return
    }
    window.location.assign(googleUrl)
  }

  const submitPrivateFeedback = async () => {
    if (!rating || !message.trim() || !businessId) {
      setError('Pasirinkite įvertinimą ir parašykite žinutę.')
      return
    }
    setSending(true)
    setError('')
    const { error: insertError } = await supabase.from('feedbacks').insert({
      user_id: businessId,
      name: name.trim() || 'Anoniminis klientas',
      rating,
      comment: message.trim(),
      sent_to_google: false,
      created_at: new Date().toISOString(),
    })
    setSending(false)
    if (insertError) {
      setError(`Žinutės išsiųsti nepavyko: ${insertError.message}`)
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><div className="bg-white border border-[#dadce0] rounded-2xl p-8 max-w-md w-full text-center shadow-sm"><span className="h-14 w-14 rounded-2xl bg-[#e6f4ea] text-[#137333] grid place-items-center mx-auto mb-5"><CheckCircle2 size={27} /></span><h1 className="text-2xl font-extrabold mb-3">Ačiū už jūsų žinutę</h1><p className="text-sm text-[#5f6368] leading-relaxed">Jūsų atsiliepimas perduotas įmonės vadovui. Jis su jumis susisieks, jei reikės.</p></div></main>
  }

  return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><div className="bg-white border border-[#dadce0] rounded-2xl p-7 sm:p-9 max-w-md w-full shadow-sm"><div className="flex items-center justify-center gap-2 mb-8">{logoUrl ? <img src={logoUrl} alt="Įmonės logotipas" className="h-10 w-10 rounded-xl object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1a73e8] text-white"><Sparkles size={18} /></span>}<span className="text-lg font-bold">{logoUrl ? 'Jūsų atsiliepimas' : <><span className="text-[#1a73e8]">Get</span>review</>}</span></div><h1 className="text-2xl font-extrabold text-center mb-2">Kaip įvertintumėte savo patirtį?</h1><p className="text-sm text-[#5f6368] text-center mb-7">Jūsų nuomonė padeda mums tobulėti.</p><div className="flex justify-center gap-2 mb-7" aria-label="Pasirinkite įvertinimą">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} žvaigždutės`} onClick={() => { setRating(value); setError('') }} className="p-1 transition hover:scale-110"><Star size={38} className={value <= rating ? 'text-[#f29900]' : 'text-[#dadce0]'} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>{rating > 0 && (isPositive ? <div className="bg-[#e6f4ea] border border-[#b7dfc1] rounded-xl p-5 text-center"><h2 className="font-bold text-[#137333] mb-2">Džiaugiamės, kad patirtis patiko!</h2><p className="text-sm text-[#3c4043] mb-4">Padėkite mus rasti ir kitiems klientams.</p>{googleUrl ? <a href={googleUrl} target="_blank" rel="noreferrer" onClick={recordGoogleClick} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl py-2.5 px-4 text-sm font-semibold inline-flex items-center gap-2">{isGoogleDestination ? 'Įvertinti mus Google' : 'Atidaryti svetainę'} <Send size={15} /></a> : <p className="text-xs text-[#5f6368]">Nukreipimo nuoroda dar nenustatyta.</p>}</div> : <div className="bg-[#fef7e0] border border-[#f9df96] rounded-xl p-5"><h2 className="font-bold text-[#b06000] mb-2">Ačiū, kad pasakėte</h2><p className="text-sm text-[#3c4043] mb-4">Jūsų pastaba liks privati ir bus perduota įmonės vadovui.</p><input type="text" placeholder="Jūsų vardas (neprivaloma)" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-white border border-[#dadce0] rounded-lg p-3 text-sm mb-3" /><textarea placeholder="Parašykite pranešimą vadovui..." value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full bg-white border border-[#dadce0] rounded-lg p-3 text-sm resize-none" /><button onClick={submitPrivateFeedback} disabled={sending} className="mt-3 w-full bg-[#b06000] hover:bg-[#8f4d00] text-white rounded-xl py-2.5 text-sm font-semibold">{sending ? 'Siunčiama...' : 'Siųsti pranešimą vadovui'}</button></div>)}{error && <p className="text-sm text-[#c5221f] text-center mt-4">{error}</p>}</div></main>
}
