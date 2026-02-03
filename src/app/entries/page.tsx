import { createServerSupabase } from '@/lib/supabase-server'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import EntryCard from '@/components/EntryCard'
import { Plus, Calendar as CalendarIcon, List, Search, Download, Flame, TrendingUp, BarChart3 } from 'lucide-react'

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; tag?: string; from?: string; to?: string }> }) {
  const { view, q, tag, from, to } = await searchParams
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Build query
  let query = supabase
    .from('entries')
    .select(`
      *,
      entry_tags (
        tags (
          name
        )
      )
    `)
    .eq('user_id', user?.id)

  if (q) {
    query = query.or(`highlights_high.ilike.%${q}%,highlights_low.ilike.%${q}%,morning.ilike.%${q}%,afternoon.ilike.%${q}%,night.ilike.%${q}%`)
  }
  if (tag) {
    query = query.eq('entry_tags.tags.name', tag)
  }
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data: entries } = await query.order('date', { ascending: false })

  // Get analytics
  const { data: allEntries } = await supabase
    .from('entries')
    .select('date, p_score, l_score, weight')
    .eq('user_id', user?.id)

  // Calculate streak
  let currentStreak = 0
  let bestStreak = 0
  const sortedDates = allEntries?.map(e => e.date).sort((a, b) => 
    new Date(a!).getTime() - new Date(b!).getTime()
  ) || []

  if (sortedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0]
    const mostRecent = sortedDates[sortedDates.length - 1]
    const daysSinceRecent = Math.floor((new Date(today).getTime() - new Date(mostRecent!).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceRecent <= 1) {
      currentStreak = 1
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const diff = Math.floor((new Date(sortedDates[i]!).getTime() - new Date(sortedDates[i - 1]!).getTime()) / (1000 * 60 * 60 * 24))
        if (diff === 1) currentStreak++
        else break
      }
    }

    let tempStreak = 1
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = Math.floor((new Date(sortedDates[i]!).getTime() - new Date(sortedDates[i - 1]!).getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) tempStreak++
      else tempStreak = 1
      if (tempStreak > bestStreak) bestStreak = tempStreak
    }
  }

  // Get calendar data
  const { data: calendarEntries } = await supabase
    .from('entries')
    .select('date')
    .eq('user_id', user?.id)

  const today = new Date()
  const monthStart = startOfMonth(today)
  const monthEnd = endOfMonth(today)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const entriesByDate = calendarEntries?.reduce((acc, e) => {
    acc[e.date] = true
    return acc
  }, {} as Record<string, boolean>) || {}

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Journal</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/entries/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              New Entry
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Analytics Widget */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Link href="/entries?view=calendar" className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Flame className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">{currentStreak}</p>
                <p className="text-sm text-zinc-500">Day Streak</p>
              </div>
            </div>
          </Link>
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">{bestStreak}</p>
                <p className="text-sm text-zinc-500">Best Streak</p>
              </div>
            </div>
          </div>
          <Link href="/entries?view=calendar" className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">{allEntries?.length || 0}</p>
                <p className="text-sm text-zinc-500">Total Entries</p>
              </div>
            </div>
          </Link>
          <a href="/api/entries/export" className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300 transition-colors group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Download className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-semibold text-zinc-900">CSV</p>
                <p className="text-sm text-zinc-500">Export Data</p>
              </div>
            </div>
          </a>
        </div>

        {/* Search & Filter */}
        <form className="bg-white rounded-xl border border-zinc-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search entries..."
                className="w-full pl-10 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>
            <div className="flex gap-2">
              <input
                name="tag"
                defaultValue={tag}
                placeholder="Filter by tag..."
                className="w-32 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <input
                name="from"
                defaultValue={from}
                type="date"
                placeholder="From"
                className="w-36 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <input
                name="to"
                defaultValue={to}
                type="date"
                placeholder="To"
                className="w-36 px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
              >
                Filter
              </button>
              {(q || tag || from || to) && (
                <Link
                  href="/entries"
                  className="px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium hover:bg-zinc-50 transition-colors"
                >
                  Clear
                </Link>
              )}
            </div>
          </div>
        </form>

        {/* View Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link
              href="/entries?view=calendar"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                view === 'calendar' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              Calendar
            </Link>
            <Link
              href="/entries?view=list"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                view !== 'calendar' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <List className="w-4 h-4" />
              List
            </Link>
          </div>
          <p className="text-sm text-zinc-500">
            {entries?.length || 0} entries
          </p>
        </div>

        {/* Calendar View */}
        {view === 'calendar' ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <h2 className="text-lg font-medium text-zinc-900 mb-4">
              {format(today, 'MMMM yyyy')}
            </h2>
            <div className="grid grid-cols-7 gap-1">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-zinc-400 py-2">
                  {day}
                </div>
              ))}
              {Array(monthStart.getDay()).fill(null).map((_, i) => (
                <div key={`empty-${i}`} className="h-10" />
              ))}
              {calendarDays.map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const hasEntry = entriesByDate[dateStr]
                
                return (
                  <Link
                    key={dateStr}
                    href={hasEntry ? `/entries/${dateStr}` : `/entries/new?date=${dateStr}`}
                    className={`h-10 flex items-center justify-center rounded-lg text-sm transition-colors ${
                      isToday(day)
                        ? 'bg-zinc-900 text-white font-medium'
                        : hasEntry
                        ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                        : 'text-zinc-600 hover:bg-zinc-50'
                    }`}
                  >
                    {format(day, 'd')}
                  </Link>
                )
              })}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {entries?.map((entry) => {
              const tags = entry.entry_tags
                ?.map((et: { tags?: { name: string } | null }) => et.tags?.name)
                .filter((name: unknown): name is string => typeof name === 'string') || []
              
              return (
                <EntryCard key={entry.id} entry={entry} tags={tags} />
              )
            })}

            {entries?.length === 0 && (
              <div className="text-center py-16">
                <p className="text-zinc-500 mb-4">No entries found</p>
                <Link
                  href="/entries/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create your first entry
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
