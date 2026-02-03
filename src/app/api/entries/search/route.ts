import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')
  const tag = searchParams.get('tag')
  const minPScore = searchParams.get('minP')
  const maxPScore = searchParams.get('maxP')
  const minLScore = searchParams.get('minL')
  const maxLScore = searchParams.get('maxL')
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let queryBuilder = supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tags (
          id,
          name
        )
      )
    `, { count: 'exact' })
    .eq('user_id', user.id)

  // Text search across content fields
  if (query) {
    const searchCondition = `
      highlights_high.ilike.%${query}%,
      highlights_low.ilike.%${query}%,
      morning.ilike.%${query}%,
      afternoon.ilike.%${query}%,
      night.ilike.%${query}%
    `
    queryBuilder = queryBuilder.or(searchCondition)
  }

  // Tag filter
  if (tag) {
    queryBuilder = queryBuilder.eq('entry_tags.tags.name', tag)
  }

  // Score range filters
  if (minPScore) queryBuilder = queryBuilder.gte('p_score', parseInt(minPScore))
  if (maxPScore) queryBuilder = queryBuilder.lte('p_score', parseInt(maxPScore))
  if (minLScore) queryBuilder = queryBuilder.gte('l_score', parseInt(minLScore))
  if (maxLScore) queryBuilder = queryBuilder.lte('l_score', parseInt(maxLScore))

  // Date range filters
  if (fromDate) queryBuilder = queryBuilder.gte('date', fromDate)
  if (toDate) queryBuilder = queryBuilder.lte('date', toDate)

  // Order and paginate
  const { data: entries, error, count } = await queryBuilder
    .order('date', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ entries, count, limit, offset })
}
