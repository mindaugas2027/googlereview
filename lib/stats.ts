import type { SupabaseClient } from '@supabase/supabase-js'

/** Kiek atsiliepimų rodoma viename „Atsiliepimai" skilties puslapyje. */
export const FEEDBACK_PAGE_SIZE = 21

/**
 * Inkrementinė vartotojo statistika, kurią palaiko Supabase trigger'iai
 * (public/business_stats lentelė). Frontend'as tik skaito gatavus skaitiklius —
 * jokių pilnų atsiliepimų/nuskaitymų skenavimų.
 */
export type BusinessStats = {
  total_feedbacks: number
  google_redirects: number
  rating_sum: number
  rating_1: number
  rating_2: number
  rating_3: number
  rating_4: number
  rating_5: number
  total_qr_scans: number
}

export const EMPTY_STATS: BusinessStats = {
  total_feedbacks: 0,
  google_redirects: 0,
  rating_sum: 0,
  rating_1: 0,
  rating_2: 0,
  rating_3: 0,
  rating_4: 0,
  rating_5: 0,
  total_qr_scans: 0,
}

const toCount = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 0
}

/** Paverčia bet kokį įrašą (DB eilutę, realtime payload'ą, API atsakymą) į saugų BusinessStats objektą. */
export function normalizeStats(value: unknown): BusinessStats {
  if (!value || typeof value !== 'object') return { ...EMPTY_STATS }
  const row = value as Record<string, unknown>
  return {
    total_feedbacks: toCount(row.total_feedbacks),
    google_redirects: toCount(row.google_redirects),
    rating_sum: toCount(row.rating_sum),
    rating_1: toCount(row.rating_1),
    rating_2: toCount(row.rating_2),
    rating_3: toCount(row.rating_3),
    rating_4: toCount(row.rating_4),
    rating_5: toCount(row.rating_5),
    total_qr_scans: toCount(row.total_qr_scans),
  }
}

/** Žvaigždučių kiekio paėmimas pagal reitingą (1–5) iš skaitiklių. */
export function ratingCount(stats: BusinessStats, rating: number): number {
  switch (rating) {
    case 1: return stats.rating_1
    case 2: return stats.rating_2
    case 3: return stats.rating_3
    case 4: return stats.rating_4
    case 5: return stats.rating_5
    default: return 0
  }
}

/**
 * Perskaito vartotojo skaitiklius iš business_stats. Jei eilutės dar nėra
 * (pvz., nebuvo paleistas backfill SQL) — ją suskaičiuoja ir sukuria
 * (savęs atkūrimas), kad skaitikliai niekada nebūtų klaidingi.
 * Naudojama TIK serveryje (service role klientas).
 */
export async function readOrInitStats(client: SupabaseClient, userId: string): Promise<BusinessStats> {
  const { data } = await client
    .from('business_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (data) return normalizeStats(data)

  const [feedbackResult, scanResult] = await Promise.all([
    client.from('feedbacks').select('rating, sent_to_google').eq('user_id', userId),
    client.from('qr_scans').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const stats: BusinessStats = { ...EMPTY_STATS, total_qr_scans: toCount(scanResult.count) }
  for (const row of feedbackResult.data || []) {
    stats.total_feedbacks += 1
    if (row.sent_to_google) stats.google_redirects += 1
    const rating = Number(row.rating)
    if (rating >= 1 && rating <= 5) {
      stats.rating_sum += rating
      if (rating === 1) stats.rating_1 += 1
      else if (rating === 2) stats.rating_2 += 1
      else if (rating === 3) stats.rating_3 += 1
      else if (rating === 4) stats.rating_4 += 1
      else if (rating === 5) stats.rating_5 += 1
    }
  }

  if (stats.total_feedbacks > 0 || stats.total_qr_scans > 0) {
    // ignoreDuplicates — jei trigger'is jau sukūrė eilutę lygiagrečiai, paliekam jo vertes
    await client
      .from('business_stats')
      .upsert({ user_id: userId, ...stats }, { onConflict: 'user_id', ignoreDuplicates: true })
  }
  return stats
}
