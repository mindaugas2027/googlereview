/**
 * Prenumeratos planai ir jų limitai.
 *
 * Planas saugomas vartotojo `user_metadata.plan_id` (keičia administratorius).
 * Limitus tikrina API maršrutai serverio pusėje — frontend'as juos tik rodo.
 */
export type PlanId = 'startas' | 'pro' | 'verslas';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceEur: number;
  /** Kaina su Lietuvišku skaičiaus formatu, pvz. „14,99 €“. */
  priceLabel: string;
  description: string;
  popular?: boolean;
  /** Didžiausias leistinas vietų skaičius (-1 = neribota). */
  maxLocations: number;
  /** Didžiausias leistinas QR kodų skaičius (-1 = neribota). */
  maxQrCodes: number;
  /**
   * Ar planas naudoja naująją vietų sistemą (atSKIrtos vietos su savo Google
   * nuorodomis ir QR susiejimu). Planams be jos „Vietos“ tab'as lieka senas —
   * viena bendra Google Review nuoroda (metadata.google_review_url).
   */
  usesLocations: boolean;
  features: string[];
};

export const PLANS: Record<PlanId, PlanDefinition> = {
  startas: {
    id: 'startas',
    name: 'Startas',
    priceEur: 14.99,
    priceLabel: '14,99 €',
    description: 'Mažoms įmonėms ir individualiems meistrams.',
    maxLocations: 1,
    maxQrCodes: 1,
    usesLocations: false,
    features: [
      '1 vieta / adresas',
      '1 QR kodas',
      'Neriboti QR nuskaitymai',
      'Pagrindinė analitika',
      'QR kodas spaudai (PDF)',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceEur: 19.99,
    priceLabel: '19,99 €',
    description: 'Augantiems verslams su komanda.',
    popular: true,
    maxLocations: 1,
    maxQrCodes: -1,
    usesLocations: false,
    features: [
      'Neriboti QR kodai',
      'QR statistika pagal stalus / darbuotojus',
      '1 vieta / adresas',
      'PDF atsisiuntimas kiekvienam QR kodui',
      'Išplėstinė analitika',
    ],
  },
  verslas: {
    id: 'verslas',
    name: 'Verslas',
    priceEur: 34.99,
    priceLabel: '34,99 €',
    description: 'Tinklams ir didelėms įmonėms.',
    maxLocations: 5,
    maxQrCodes: -1,
    usesLocations: true,
    features: [
      'Visos Pro plano funkcijos',
      'Iki 5 vietų / adresų',
      'QR kodai susieti su vietomis',
      'Kiekvienos vietos atsiliepimų statistika',
      'Neriboti QR nuskaitymai',
    ],
  },
};

export const PLAN_LIST: PlanDefinition[] = [PLANS.startas, PLANS.pro, PLANS.verslas];

/** Grąžina planą pagal id; neatpažįstamam (arba seniems) vartotojams — pigiausias Startas. */
export function getPlan(planId: unknown): PlanDefinition {
  if (typeof planId === 'string' && planId in PLANS) return PLANS[planId as PlanId];
  return PLANS.startas;
}

/** Nepainus limito vaizdas: -1 → „Neribota“. */
export function formatLimit(limit: number): string {
  return limit < 0 ? 'Neribota' : String(limit);
}
