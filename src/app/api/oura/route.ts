import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabase>>

// Oura Cloud API docs: https://cloud.ouraring.com/docs/

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get user's Oura token from database
  const { data: integration } = await supabase
    .from('integrations')
    .select('access_token')
    .eq('user_id', user.id)
    .eq('provider', 'oura')
    .single()

  if (!integration?.access_token) {
    return NextResponse.json({ 
      error: 'Oura not connected',
      authUrl: `/api/oauth/oura?user_id=${user.id}` 
    }, { status: 401 })
  }

  try {
    // Fetch sleep data from Oura API
    const response = await fetch(
      `https://api.ouraring.com/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`,
      {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch Oura data')
    }

    const data = await response.json()
    const sleepData: OuraSleepData[] = data.data || []

    // Save to database
    for (const sleep of sleepData) {
      await supabase.from('oura_data').upsert({
        user_id: user.id,
        date: sleep.day,
        sleep_score: sleep.score,
        readiness_score: sleep.readiness_score,
        activity_score: sleep.activity_score,
        hrv: sleep.average_hrv || sleep.hrv_balance?.total,
        resting_heart_rate: sleep.resting_heart_rate,
        total_sleep_duration: sleep.total_sleep_duration,
        deep_sleep_duration: sleep.deep_sleep_duration,
        rem_sleep_duration: sleep.rem_sleep_duration,
        light_sleep_duration: sleep.light_sleep_duration,
        awake_duration: sleep.awake_duration,
        data: sleep
      }, {
        onConflict: 'user_id,date',
        ignoreDuplicates: true
      })
    }

    return NextResponse.json({ 
      data: sleepData,
      source: 'api',
      saved: sleepData.length
    })
  } catch (error) {
    console.error('Oura API error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      // Fallback to cached data
      cached: await getCachedOuraData(supabase, user.id, startDate, endDate)
    }, { status: 500 })
  }
}

interface OuraSleepData {
  day: string
  score?: number
  readiness_score?: number
  activity_score?: number
  average_hrv?: number
  hrv_balance?: { total?: number }
  resting_heart_rate?: number
  total_sleep_duration?: number
  deep_sleep_duration?: number
  rem_sleep_duration?: number
  light_sleep_duration?: number
  awake_duration?: number
}

async function getCachedOuraData(supabase: SupabaseClient, userId: string, startDate: string, endDate: string): Promise<OuraSleepData[]> {
  const { data } = await supabase
    .from('oura_data')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: false })

  return (data as OuraSleepData[]) || []
}
