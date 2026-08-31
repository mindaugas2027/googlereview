import { SupabaseClient } from '@supabase/supabase-js'
import { canAccessBusiness, requireServiceUser } from '@/lib/admin-auth'
import { getPlan, type PlanDefinition } from '@/lib/plans'

export type TargetGuard =
  | { ok: true; client: SupabaseClient; userId: string; plan: PlanDefinition; metadata: Record<string, unknown> }
  | { ok: false; status: number; error: string }

/**
 * Patvirtina Bearer token'ą ir nustato, kurio vartotojo duomenys tvarkomi:
 * paprastas vartotojas — tik savo, administratorius (view_as režimas) — ir
 * ?business=<id> nurodyto kliento. Grąžina ir vartotojo planą su limitais.
 */
export async function resolveTargetUser(request: Request): Promise<TargetGuard> {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return guard

  const requestedUserId = new URL(request.url).searchParams.get('business')?.trim() || guard.userId
  if (!canAccessBusiness(requestedUserId, guard.userId, guard.userEmail)) {
    return { ok: false, status: 403, error: 'Unauthorized' }
  }

  try {
    const { data, error } = await guard.client.auth.admin.getUserById(requestedUserId)
    if (error || !data.user) return { ok: false, status: 404, error: 'User not found' }
    const metadata = (data.user.user_metadata || {}) as Record<string, unknown>
    return {
      ok: true,
      client: guard.client,
      userId: requestedUserId,
      plan: getPlan(metadata.plan_id),
      metadata,
    }
  } catch (cause) {
    console.error('[api-helpers] Nepavyko gauti vartotojo:', cause)
    return { ok: false, status: 502, error: 'Nepavyko susisiekti su Supabase Auth tarnyba.' }
  }
}

/** Suvienodina Google Review nuorodos formatą (prideda https://, jei trūksta). */
export function normalizeGoogleReviewUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}
