import { createServerSupabase } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import EntryForm from '@/components/EntryForm'
import TimelineWidget from '@/components/TimelineWidget'
import { parseEntry } from '@/lib/parse-bullets'
import { ArrowLeft } from 'lucide-react'

export default async function EntryPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Parallelize all DB queries for better performance
  const [entryResult, tagsResult, locationResult] = await Promise.all([
    supabase
      .from('entries')
      .select(`
        *,
        entry_tags (
          tag_id,
          tags (
            id,
            name
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle(),
    supabase
      .from('tags')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('location_data')
      .select('places')
      .eq('user_id', user.id)
      .eq('date', date)
      .maybeSingle(),
  ])

  const entry = entryResult.data
  const tags = tagsResult.data
  const locationData = locationResult.data

  // Parse entry bullets for timeline
  const parsedBullets = entry
    ? parseEntry(entry.morning, entry.afternoon, entry.night, date)
    : { all: [] }

  const selectedTagIds = entry?.entry_tags
    ?.map((et: { tags?: { id: string } | null }) => et.tags?.id)
    .filter((id: unknown): id is string => typeof id === 'string') || []

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Sticky Header with Back Button */}
      <div className="sticky top-0 z-10 bg-zinc-50/95 backdrop-blur-sm border-b border-zinc-200">
        <div className="max-w-2xl mx-auto py-4 px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/entries"
              className="p-2 -ml-2 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              aria-label="Back to entries"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-900">
                {entry ? 'Edit Entry' : 'New Entry'}
              </h1>
              <p className="text-sm text-zinc-500">{format(new Date(date), 'EEEE, MMM d')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        {/* Timeline Widget - shows if there's location data or entry content */}
        {(locationData?.places?.length > 0 || parsedBullets.all.length > 0) && (
          <TimelineWidget
            date={date}
            places={locationData?.places || []}
            bullets={parsedBullets.all}
            compact={true}
          />
        )}

        <EntryForm
          initialDate={date}
          entry={entry || undefined}
          selectedTagIds={selectedTagIds}
          availableTags={tags || []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
