import { NextRequest, NextResponse } from 'next/server'
import { canAccessBusiness, requireServiceUser } from '@/lib/admin-auth'
import { FEEDBACK_PAGE_SIZE } from '@/lib/stats'

export const dynamic = 'force-dynamic'

type FeedbackSort = 'newest' | 'oldest' | 'rating-high' | 'rating-low'

const SORT_COLUMNS: Record<FeedbackSort, Array<{ column: string; ascending: boolean }>> = {
  newest: [{ column: 'created_at', ascending: false }],
  oldest: [{ column: 'created_at', ascending: true }],
  'rating-high': [{ column: 'rating', ascending: false }, { column: 'created_at', ascending: false }],
  'rating-low': [{ column: 'rating', ascending: true }, { column: 'created_at', ascending: false }],
}

/**
 * GET /api/feedbacks?business=<uuid>&page=1&sort=newest&rating=4&qr=<uuid>
 * Puslapiuotas atsiliepimų sąrašas (21 įrašas per puslapį). Rikiavimas ir
 * įvertinimo filtras taikomi duomenų bazėje — iš serverio grąžinami tik
 * to puslapio įrašai ir bendras kiekis, todėl tūkstančiai atsiliepimų
 * nekraunami visi iš karto.
 */
export async function GET(request: NextRequest) {
  const guard = await requireServiceUser(request)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })
  const { client, userId, userEmail } = guard

  try {
    const searchParams = request.nextUrl.searchParams
    const businessId = searchParams.get('business')?.trim() || userId
    if (!canAccessBusiness(businessId, userId, userEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sortParam = (searchParams.get('sort') || 'newest') as FeedbackSort
    const sort = SORT_COLUMNS[sortParam] ? sortParam : 'newest'
    const ratingParam = Number(searchParams.get('rating'))
    const ratingFilter = ratingParam >= 1 && ratingParam <= 5 ? Math.round(ratingParam) : null
    const qrFilter = searchParams.get('qr')?.trim() || null
    const pageParam = Number(searchParams.get('page'))
    const page = Number.isFinite(pageParam) && pageParam >= 1 ? Math.floor(pageParam) : 1
    const from = (page - 1) * FEEDBACK_PAGE_SIZE
    const to = from + FEEDBACK_PAGE_SIZE - 1

    let query = client
      .from('feedbacks')
      .select('id, name, rating, comment, created_at, sent_to_google, qr_code_id, qr_codes(label)', { count: 'exact' })
      .eq('user_id', businessId)
    if (ratingFilter !== null) query = query.eq('rating', ratingFilter)
    if (qrFilter === 'unassigned') query = query.is('qr_code_id', null)
    else if (qrFilter) query = query.eq('qr_code_id', qrFilter)
    for (const order of SORT_COLUMNS[sort]) {
      query = query.order(order.column, { ascending: order.ascending })
    }

    const { data, count, error } = await query.range(from, to)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      feedbacks: data || [],
      total: count ?? 0,
      page,
      pageSize: FEEDBACK_PAGE_SIZE,
    })
  } catch (cause) {
    console.error('[api/feedbacks] GET nepavyko:', cause)
    const message = cause instanceof Error ? cause.message : 'Netikėta serverio klaida.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
