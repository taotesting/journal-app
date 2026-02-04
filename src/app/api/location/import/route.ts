import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

/**
 * Place visit from Google Takeout Semantic Location History
 */
interface TakeoutPlaceVisit {
  location: {
    latitudeE7?: number
    longitudeE7?: number
    name?: string
    address?: string
    placeId?: string
  }
  duration: {
    startTimestamp: string
    endTimestamp: string
  }
}

/**
 * Semantic Location History file structure from Google Takeout
 */
interface SemanticLocationHistory {
  timelineObjects?: Array<{
    placeVisit?: TakeoutPlaceVisit
    activitySegment?: unknown
  }>
}

/**
 * Place visit stored in our database
 */
export interface PlaceVisit {
  name: string
  address: string
  lat: number
  lng: number
  startTime: string
  endTime: string
  duration: number // minutes
  placeId?: string
}

/**
 * Parse Google Takeout Semantic Location History JSON
 */
function parseSemanticLocationHistory(data: SemanticLocationHistory): PlaceVisit[] {
  const places: PlaceVisit[] = []

  if (!data.timelineObjects) {
    return places
  }

  for (const obj of data.timelineObjects) {
    if (!obj.placeVisit) continue

    const visit = obj.placeVisit
    const location = visit.location
    const duration = visit.duration

    if (!location || !duration) continue

    // Convert E7 coordinates (scaled by 10^7) to regular lat/lng
    const lat = (location.latitudeE7 ?? 0) / 1e7
    const lng = (location.longitudeE7 ?? 0) / 1e7

    // Skip if no meaningful location data
    if (!lat && !lng && !location.name) continue

    const startTime = new Date(duration.startTimestamp)
    const endTime = new Date(duration.endTimestamp)
    const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

    places.push({
      name: location.name || 'Unknown Location',
      address: location.address || '',
      lat,
      lng,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      duration: durationMinutes,
      placeId: location.placeId,
    })
  }

  return places
}

/**
 * Group places by date (YYYY-MM-DD)
 */
function groupByDate(places: PlaceVisit[]): Map<string, PlaceVisit[]> {
  const grouped = new Map<string, PlaceVisit[]>()

  for (const place of places) {
    const date = place.startTime.split('T')[0]
    const existing = grouped.get(date) || []
    existing.push(place)
    grouped.set(date, existing)
  }

  return grouped
}

export async function POST(request: Request) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    let totalPlaces = 0
    let totalDates = 0
    const dateRange: { start?: string; end?: string } = {}

    for (const file of files) {
      // Validate file type
      if (!file.name.endsWith('.json')) {
        continue
      }

      const text = await file.text()
      let data: SemanticLocationHistory

      try {
        data = JSON.parse(text)
      } catch {
        console.error(`Failed to parse JSON file: ${file.name}`)
        continue
      }

      // Parse the semantic location history
      const places = parseSemanticLocationHistory(data)
      totalPlaces += places.length

      // Group by date
      const byDate = groupByDate(places)

      // Upsert each date's places
      for (const [date, datePlaces] of byDate) {
        // Update date range tracking
        if (!dateRange.start || date < dateRange.start) {
          dateRange.start = date
        }
        if (!dateRange.end || date > dateRange.end) {
          dateRange.end = date
        }

        // Sort places by start time
        datePlaces.sort((a, b) => a.startTime.localeCompare(b.startTime))

        const { error } = await supabase
          .from('location_data')
          .upsert({
            user_id: user.id,
            date,
            places: datePlaces,
          }, { onConflict: 'user_id,date' })

        if (error) {
          console.error(`Error upserting location data for ${date}:`, error)
        } else {
          totalDates++
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalPlaces,
        totalDates,
        dateRange,
      },
    })
  } catch (error) {
    console.error('Location import error:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Import failed',
    }, { status: 500 })
  }
}

/**
 * GET endpoint to check import status / get summary
 */
export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get summary of imported location data
  const { data, error } = await supabase
    .from('location_data')
    .select('date, places')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json({
      hasData: false,
      totalDates: 0,
      totalPlaces: 0,
      dateRange: null,
    })
  }

  // Calculate stats
  const totalPlaces = data.reduce((sum, row) => {
    const places = row.places as PlaceVisit[] | null
    return sum + (places?.length || 0)
  }, 0)

  return NextResponse.json({
    hasData: true,
    totalDates: data.length,
    totalPlaces,
    dateRange: {
      start: data[0].date,
      end: data[data.length - 1].date,
    },
  })
}
