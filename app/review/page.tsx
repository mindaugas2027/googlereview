'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Send, Sparkles, Star } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type ResolvedConfig = {
  googleUrl: string
  threshold: number
  logoUrl: string
  qrCodeId: string | null
  locationId: string | null
}

export default function ReviewPage() {
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  // Naujųjų QR kodų (?qr=) konfigūracija, gaunama iš /api/qr/resolve
  const [resolved, setResolved] = useState<ResolvedConfig | null>(null)
  const [resolveError, setResolveError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const businessId = params?.get('business') || ''
  const rawGoogleUrl = params?.get('google') || ''
  const qrParam = params?.get('qr') || ''
  // Senosios QR nuorodos neša viską URL parametruose — naujosios konfigūraciją
  // pasiima per /api/qr/resolve pagal QR kodo ID.
  const legacyGoogleUrl = rawGoogleUrl && !/^https?:\/\//i.test(rawGoogleUrl) ? `https://${rawGoogleUrl}` : rawGoogleUrl
  const legacyLogoUrl = params?.get('logo') || ''
  const legacyThreshold = Math.min(5, Math.max(1, Number(params?.get('threshold')) || 4))

  const googleUrl = resolved ? resolved.googleUrl : legacyGoogleUrl
  const logoUrl = resolved ? resolved.logoUrl : legacyLogoUrl
  const threshold = resolved ? resolved.threshold : legacyThreshold
  const isPositive = rating >= threshold
  const scanRecorded = useRef(false)

  // Senųjų nuorodų nuskaitymas (be QR kodo) — kaip ir anksčiau
  useEffect(() => {
    if (!businessId || qrParam || scanRecorded.current) return
    scanRecorded.current = true
    supabase.from('qr_scans').insert({ user_id: businessId }).then(({ error }) => {
      if (error) console.error('QR scan could not be recorded', error)
    })
  }, [businessId, qrParam])

  // Naujųjų QR kodų konfigūracija (nuskaitymą užfiksuota /api/qr/resolve pusėje)
  useEffect(() => {
    if (!businessId || !qrParam) return
    let cancelled = false
    const loadConfig = async () => {
      setResolveError(false)
      try {
        const response = await fetch(`/api/qr/resolve?business=${encodeURIComponent(businessId)}&qr=${encodeURIComponent(qrParam)}`)
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload) throw new Error(payload?.error || 'Nepavyko gauti QR nustatymų.')
        if (cancelled) return
        setResolved({
          googleUrl: typeof payload.google_review_url === 'string' && payload.google_review_url
            ? (/^https?:\/\//i.test(payload.google_review_url) ? payload.google_review_url : `https://${payload.google_review_url}`)
            : '',
          threshold: Math.min(5, Math.max(1, Number(payload.google_min_rating) || 4)),
          logoUrl: payload.logo_url || '',
          qrCodeId: payload.qr_code_id || null,
          locationId: payload.location_id || null,
        })
      } catch (cause) {
        console.error('QR config resolution failed', cause)
        if (!cancelled) setResolveError(true)
      }
    }
    void loadConfig()
    return () => { cancelled = true }
  }, [businessId, qrParam, retryKey])

  const recordGoogleClick = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const { error: insertError } = await supabase.from('feedbacks').insert({
      user_id: businessId,
      name: name.trim() || 'Anoniminis klientas',
      rating,
      comment: 'Klientas nukreiptas į Google Review.',
      sent_to_google: true,
      created_at: new Date().toISOString(),
      qr_code_id: resolved?.qrCodeId ?? null,
      location_id: resolved?.locationId ?? null,
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
      qr_code_id: resolved?.qrCodeId ?? null,
      location_id: resolved?.locationId ?? null,
    })
    setSending(false)
    if (insertError) {
      setError(`Žinutės išsiųsti nepavyko: ${insertError.message}`)
      return
    }
    setSubmitted(true)
  }

  if (qrParam && resolveError) {
    return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><div className="bg-white border border-[#dadce0] rounded-2xl p-8 max-w-md w-full text-center shadow-sm"><h1 className="text-xl font-extrabold mb-2">QR kodas nerastas</h1><p className="text-sm text-[#5f6368] mb-5">Nepavyko gauti šio QR kodo nustatymų. Pabandykite nuskaityti dar kartą.</p><button onClick={() => setRetryKey((value) => value + 1)} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl py-2.5 px-4 text-sm font-semibold">Bandyti dar kartą</button></div></main>
  }

  if (qrParam && !resolved) {
    return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><Loader2 className="animate-spin text-[#1a73e8]" size={30} /></main>
  }

  if (submitted) {
    return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><div className="bg-white border border-[#dadce0] rounded-2xl p-8 max-w-md w-full text-center shadow-sm"><span className="h-14 w-14 rounded-2xl bg-[#e6f4ea] text-[#137333] grid place-items-center mx-auto mb-5"><CheckCircle2 size={27} /></span><h1 className="text-2xl font-extrabold mb-3">Ačiū už jūsų žinutę</h1><p className="text-sm text-[#5f6368] leading-relaxed">Jūsų atsiliepimas perduotas įmonės vadovui.</p></div></main>
  }

  return <main className="min-h-screen bg-[#f8fafd] text-[#202124] flex items-center justify-center p-6"><div className="bg-white border border-[#dadce0] rounded-2xl p-7 sm:p-9 max-w-md w-full shadow-sm"><div className="flex items-center justify-center gap-2 mb-8">{logoUrl ? <img src={logoUrl} alt="Įmonės logotipas" className="h-10 w-10 rounded-xl object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#1a73e8] text-white"><Sparkles size={18} /></span>}<span className="text-lg font-bold">{logoUrl ? 'Jūsų atsiliepimas' : <><span className="text-[#1a73e8]">Get</span>review</>}</span></div><h1 className="text-2xl font-extrabold text-center mb-2">Kaip įvertintumėte savo patirtį?</h1><p className="text-sm text-[#5f6368] text-center mb-7">Jūsų nuomonė padeda mums tobulėti.</p><div className="flex justify-center gap-2 mb-7" aria-label="Pasirinkite įvertinimą">{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" aria-label={`${value} žvaigždutės`} onClick={() => { setRating(value); setError('') }} className="p-1 transition hover:scale-110"><Star size={38} className={value <= rating ? 'text-[#f29900]' : 'text-[#dadce0]'} fill={value <= rating ? 'currentColor' : 'none'} /></button>)}</div>{rating > 0 && (isPositive ? <div className="bg-[#e6f4ea] border border-[#b7dfc1] rounded-xl p-5 text-center"><h2 className="font-bold text-[#137333] mb-2">Džiaugiamės, kad patirtis patiko!</h2><p className="text-sm text-[#3c4043] mb-4">Padėkite mus rasti ir kitiems klientams.</p>{googleUrl ? <a href={googleUrl} target="_blank" rel="noreferrer" onClick={recordGoogleClick} className="bg-[#1a73e8] hover:bg-[#1769d1] text-white rounded-xl py-2.5 px-4 text-sm font-semibold inline-flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-white text-sm font-extrabold leading-none"><span className="bg-[conic-gradient(from_45deg,#4285f4_0_25%,#34a853_25%_45%,#fbbc05_45%_67%,#ea4335_67%_82%,#4285f4_82%)] bg-clip-text text-transparent">G</span></span>Įvertinkite mus Google <Send size={15} /></a> : <p className="text-xs text-[#5f6368]">Google Review nuoroda dar nenustatyta.</p>}</div> : <div className="bg-[#fef7e0] border border-[#f9df96] rounded-xl p-5"><h2 className="font-bold text-[#b06000] mb-2">Ačiū, kad pasakėte</h2><p className="text-sm text-[#3c4043] mb-4">Jūsų pastaba liks privati ir bus perduota įmonės vadovui.</p><input type="text" placeholder="Jūsų vardas (neprivaloma)" value={name} onChange={(event) => setName(event.target.value)} className="w-full bg-white border border-[#dadce0] rounded-lg p-3 text-sm mb-3" /><textarea placeholder="Parašykite pranešimą vadovui..." value={message} onChange={(event) => setMessage(event.target.value)} rows={4} className="w-full bg-white border border-[#dadce0] rounded-lg p-3 text-sm resize-none" /><button onClick={submitPrivateFeedback} disabled={sending} className="mt-3 w-full bg-[#b06000] hover:bg-[#8f4d00] text-white rounded-xl py-2.5 text-sm font-semibold">{sending ? 'Siunčiama...' : 'Siųsti pranešimą vadovui'}</button></div>)}{error && <p className="text-sm text-[#c5221f] text-center mt-4">{error}</p>}</div></main>
}
