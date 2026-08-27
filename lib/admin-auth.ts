import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'mindaugas2027@gmail.com'

export const DAY_MS = 24 * 60 * 60 * 1000

type TrialMeta = {
  trial_end?: string | null
  trial_started_at?: string | null
  trial_days?: number | null
}

/** Grąžina prenumeratos pabaigos laiko žymę (ms). Naudoja trial_end, o jei ne — trial_started_at + trial_days. */
export function getTrialEndMs(meta: TrialMeta | null | undefined): number {
  if (!meta) return Date.now()
  if (meta.trial_end) {
    const t = new Date(meta.trial_end).getTime()
    if (!Number.isNaN(t)) return t
  }
  const start = meta.trial_started_at ? new Date(meta.trial_started_at).getTime() : Date.now()
  const days = Number(meta.trial_days) || 14
  return start + days * DAY_MS
}

/** Grąžina likusį dienų skaičių iki prenumeratos pabaigos (0 = pasibaigusi). */
export function getTrialDaysLeft(meta: TrialMeta | null | undefined): number {
  return Math.max(0, Math.ceil((getTrialEndMs(meta) - Date.now()) / DAY_MS))
}


export type AdminGuard =
  | { ok: true; client: SupabaseClient }
  | { ok: false; status: number; error: string }

/**
 * Tikrina Bearer token ir grąžina admin klientą arba apibrėžtą JSON klaidą.
 * Niekuomet nemeta išimčių — visada grąžina rezultatą, kad API route'ai
 * negrižtų su ne-JSON (HTML 500) atsakymu, dėl ko priekinė dalis užstringa.
 */
export async function requireAdmin(request: Request): Promise<AdminGuard> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    const missing: string[] = []
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
    return {
      ok: false,
      status: 500,
      error: `Serverio konfigūracija nepilna — hostingo aplinkoje nerasta šių aplinkos kintamųjų: ${missing.join(', ')}. Pridėkite juos hostingo nustatymuose (Vercel: Settings → Environment Variables) ir atlikite Redeploy.`,
    }
  }

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { ok: false, status: 401, error: 'Unauthorized' }

  const client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  try {
    const { data: { user }, error } = await client.auth.getUser(token)
    if (error || !user || user.email?.toLowerCase() !== ADMIN_EMAIL) {
      return { ok: false, status: 401, error: 'Unauthorized' }
    }
    return { ok: true, client }
  } catch (cause) {
    console.error('[admin-auth] Supabase Auth nepasiekiamas:', cause)
    return { ok: false, status: 502, error: 'Nepavyko susisiekti su Supabase Auth tarnyba.' }
  }
}
