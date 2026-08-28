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
 * Perskaito vartotojo skaitiklius iš business_stats. Jei eilutės ar visos
 * lentelės dar nėra (pvz., nebuvo paleistas migracijų SQL) — skaitiklius
 * suskaičiuoja tiesiogiai iš feedbacks/qr_scans (senasis kelias), kad
 * sistema veiktų net ir be lenktojo agregavimo.
 * Naudojama TIK serveryje (service role klientas).
 */
export async function readOrInitStats(client: SupabaseClient, userId: string): Promise<BusinessStats> {
  try {
    const { data } = await client
      .from('business_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (data) return normalizeStats(data)
  } catch {
    // business_stats lentelės dar nėra — tiesiogiai suskaičiuojame žemiau
  }

  const [feedbackResult, scanResult] = await Promise.all([
    client.from('feedbacks').select('rating, sent_to_google').eq('user_id', userId),
    client.from('qr_scans').select('user_id', { count: 'exact', head: true }).eq('user_id', userId),
  ])

  const stats = computeFeedbackStats(
    feedbackResult.data || [],
    feedbackResult.data?.length || 0,
    scanResult.error ? 0 : toCount(scanResult.count),
  )
  stats.total_qr_scans = scanResult.error ? 0 : toCount(scanResult.count)

  if (stats.total_feedbacks > 0 || stats.total_qr_scans > 0) {
    try {
      // ignoreDuplicates — jei trigger'is jau sukūrė eilutę lygiagrečiai, paliekam jo vertes
      await client
        .from('business_stats')
        .upsert({ user_id: userId, ...stats }, { onConflict: 'user_id', ignoreDuplicates: true })
    } catch {
      // lentelės nėra — praleidžiame, skaitiklius jau turime atmintyje
    }
  }
  return stats
}

type FeedbackRow = { rating?: number | null; sent_to_google?: boolean | null }

/** Iš atsiliepimų eilučių suskaičiuoja agreguotą statistiką (vienas bendras pagalbininkas). */
function computeFeedbackStats(rows: FeedbackRow[], count: number, scanCount: number): BusinessStats {
  const stats: BusinessStats = { ...EMPTY_STATS }
  const length = rows.length
  for (const row of rows) {
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
  stats.total_feedbacks = count > 0 ? count : length
  stats.total_qr_scans = scanCount
  return stats
}

/** Visų nurodytų vartotojų skaitiklių žemėlapis, atsparus trūkstamai business_stats lentelei. */
export async function readStatsForUsers(
  client: SupabaseClient,
  userIds: string[],
): Promise<Map<string, BusinessStats>> {
  const map = new Map<string, BusinessStats>()
  if (!userIds.length) return map

  // Pirma bandoma masinė business_stats užklausa (optimalu, kai lentelė yra)
  const statsResult = await client
    .from('business_stats')
    .select('*')
    .in('user_id', userIds)
  if (!statsResult.error) {
    for (const row of statsResult.data || []) {
      map.set(String(row.user_id), normalizeStats(row))
    }
    const missingIds = userIds.filter((id) => !map.has(id))
    for (const id of missingIds) {
      map.set(id, await readOrInitStats(client, id))
    }
    return map
  }

  // Lentelės nėra (migracija nepaleista) — vienu kartu ištraukiame visus
  // vartotojų atsiliepimus ir nuskaitymus, tada agreguojame kliento pusėje.
  const [feedbackResult, scanResult] = await Promise.all([
    client.from('feedbacks').select('user_id, rating, sent_to_google').in('user_id', userIds),
    client.from('qr_scans').select('user_id').in('user_id', userIds),
  ])
  const scanCount = new Map<string, number>()
  for (const s of scanResult.data || []) {
    const key = String(s.user_id)
    scanCount.set(key, (scanCount.get(key) || 0) + 1)
  }
  const perUserCount = new Map<string, number>()
  for (const id of userIds) perUserCount.set(id, 0)
  for (const f of feedbackResult.data || []) perUserCount.set(String(f.user_id), (perUserCount.get(String(f.user_id)) || 0) + 1)
  const byUser = new Map<string, FeedbackRow[]>()
  for (const f of feedbackResult.data || []) {
    const key = String(f.user_id)
    byUser.set(key, [...(byUser.get(key) || []), f])
  }
  for (const id of userIds) {
    map.set(id, computeFeedbackStats(byUser.get(id) || [], perUserCount.get(id) || 0, scanCount.get(id) || 0))
  }
  return map
}
