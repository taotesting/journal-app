import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')

  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to get from database first
  const { data: cachedEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', date)
    .order('start_time')

  if (cachedEvents && cachedEvents.length > 0) {
    return NextResponse.json({ events: cachedEvents, source: 'cache' })
  }

  // Get the access token from Supabase
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.provider_token

  if (!accessToken) {
    return NextResponse.json({ 
      error: 'No calendar access. Please re-login with Calendar permissions.',
      needsReauth: true 
    }, { status: 401 })
  }

  // Fetch from Google Calendar API
  const startOfDay = new Date(date!)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(date!)
  endOfDay.setHours(23, 59, 59, 999)

  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${startOfDay.toISOString()}&` +
      `timeMax=${endOfDay.toISOString()}&` +
      `singleEvents=true&` +
      `orderBy=startTime`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch calendar')
    }

    const data = await response.json()
    const events = data.items || []

    // Save to database
    if (events.length > 0) {
      const eventData = events.map((event: any) => ({
        user_id: user.id,
        date: date,
        summary: event.summary || 'Busy',
        start_time: event.start?.dateTime || event.start?.date,
        end_time: event.end?.dateTime || event.end?.date,
      }))

      await supabase.from('calendar_events').upsert(eventData, { onConflict: 'user_id,summary,start_time' })
    }

    return NextResponse.json({ events, source: 'api' })
  } catch (error: any) {
    console.error('Calendar API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
