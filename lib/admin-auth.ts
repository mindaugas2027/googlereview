import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const ADMIN_EMAIL = 'mindaugas2027@gmail.com'

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
    return {
      ok: false,
      status: 500,
      error: 'Serverio konfigūracija nepilna: trūksta NEXT_PUBLIC_SUPABASE_URL arba SUPABASE_SERVICE_ROLE_KEY aplinkos kintamųjų.',
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
