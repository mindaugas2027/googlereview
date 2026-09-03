import { type PlanId, PLANS, type PlanDefinition } from '@/lib/plans'
import type { SupabaseClient } from '@supabase/supabase-js'

export type PlanPrices = Record<PlanId, number>

export const DEFAULT_PLAN_PRICES: PlanPrices = {
  startas: PLANS.startas.priceEur,
  pro: PLANS.pro.priceEur,
  verslas: PLANS.verslas.priceEur,
}

export function normalizePlanPrices(value: unknown): PlanPrices {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    startas: normalizePrice(source.startas, DEFAULT_PLAN_PRICES.startas),
    pro: normalizePrice(source.pro, DEFAULT_PLAN_PRICES.pro),
    verslas: normalizePrice(source.verslas, DEFAULT_PLAN_PRICES.verslas),
  }
}

function normalizePrice(value: unknown, fallback: number): number {
  const price = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(price) && price >= 0.01 && price <= 10000 ? Math.round(price * 100) / 100 : fallback
}

export function getPlanWithPrice(plan: PlanDefinition, prices: PlanPrices): PlanDefinition {
  const priceEur = prices[plan.id]
  return {
    ...plan,
    priceEur,
    priceLabel: `${priceEur.toLocaleString('lt-LT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`,
  }
}

export async function getConfiguredPlanPrices(client: SupabaseClient): Promise<PlanPrices> {
  const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const adminUser = data.users.find((user) => user.email?.toLowerCase() === 'mindaugas2027@gmail.com')
  return normalizePlanPrices(adminUser?.user_metadata?.plan_prices)
}
