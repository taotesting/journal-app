'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Tag {
  id: string
  name: string
}

interface CalendarEvent {
  id: string
  summary: string
  start_time: string
  end_time: string
}

interface Entry {
  id: string
  date: string
  highlights_high?: string
  highlights_low?: string
  morning?: string
  afternoon?: string
  night?: string
  p_score?: number
  l_score?: number
  weight?: number
}

interface EntryFormProps {
  initialDate: string
  entry?: Entry
  selectedTagIds?: string[]
  availableTags: Tag[]
  userId: string
}

export default function EntryForm({
  initialDate,
  entry,
  selectedTagIds = [],
  availableTags,
  userId,
}: EntryFormProps) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [date, setDate] = useState(entry?.date || initialDate)
  const [highlightsHigh, setHighlightsHigh] = useState(entry?.highlights_high || '')
  const [highlightsLow, setHighlightsLow] = useState(entry?.highlights_low || '')
  const [morning, setMorning] = useState(entry?.morning || '')
  const [afternoon, setAfternoon] = useState(entry?.afternoon || '')
  const [night, setNight] = useState(entry?.night || '')
  const [pScore, setPScore] = useState(entry?.p_score?.toString() || '')
  const [lScore, setLScore] = useState(entry?.l_score?.toString() || '')
  const [weight, setWeight] = useState(entry?.weight?.toString() || '')
  const [tags, setTags] = useState<Set<string>>(new Set(selectedTagIds))
  const [newTag, setNewTag] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [fetchingCalendar, setFetchingCalendar] = useState(false)

  const handleTagToggle = (tagId: string) => {
    const newTags = new Set(tags)
    if (newTags.has(tagId)) {
      newTags.delete(tagId)
    } else {
      newTags.add(tagId)
    }
    setTags(newTags)
  }

  const handleAddTag = async () => {
    if (!newTag.trim()) return
    
    const { data, error } = await supabase
      .from('tags')
      .insert({ user_id: userId, name: newTag.trim() })
      .select()
      .single()

    if (error) {
      setError('Error creating tag: ' + error.message)
      return
    }

    if (data) {
      availableTags.push(data)
      setTags(new Set([...tags, data.id]))
      setNewTag('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Upsert entry
      const entryData = {
        user_id: userId,
        date,
        highlights_high: highlightsHigh || null,
        highlights_low: highlightsLow || null,
        morning: morning || null,
        afternoon: afternoon || null,
        night: night || null,
        p_score: pScore ? parseInt(pScore) : null,
        l_score: lScore ? parseInt(lScore) : null,
        weight: weight ? parseFloat(weight) : null,
      }

      const { data: entryResult, error: entryError } = await supabase
        .from('entries')
        .upsert(entryData, { onConflict: 'user_id,date' })
        .select()
        .single()

      if (entryError) throw entryError

      // Delete existing entry_tags
      await supabase
        .from('entry_tags')
        .delete()
        .eq('entry_id', entryResult.id)

      // Insert new entry_tags
      if (tags.size > 0) {
        const entryTags = Array.from(tags).map(tagId => ({
          entry_id: entryResult.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase
          .from('entry_tags')
          .insert(entryTags)

        if (tagsError) throw tagsError
      }

      router.push('/entries')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const fetchCalendarEvents = async () => {
    setFetchingCalendar(true)
    try {
      const res = await fetch(`/api/calendar?date=${date}`)
      const data = await res.json()

      if (data.error) {
        if (data.needsReauth) {
          setError('Calendar not connected. Please re-login to grant calendar access.')
        } else {
          setError('Error fetching calendar: ' + data.error)
        }
        return
      }

      setCalendarEvents(data.events || [])
    } catch (err) {
      setError('Error fetching calendar: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setFetchingCalendar(false)
    }
  }

  const stubFromCalendar = () => {
    if (calendarEvents.length === 0) return

    const eventList = calendarEvents
      .map((e) => {
        const start = new Date(e.start_time)
        const time = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        return `- ${time} ${e.summary}`
      })
      .join('\n')

    setMorning((prev) => `${prev}\n\n📅 Today's Calendar:\n${eventList}`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Date
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Calendar Integration */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-blue-900">📅 Google Calendar</h3>
          <button
            type="button"
            onClick={fetchCalendarEvents}
            disabled={fetchingCalendar}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {fetchingCalendar ? 'Loading...' : 'Fetch Events'}
          </button>
        </div>
        
        {calendarEvents.length > 0 && (
          <div className="mb-3">
            <p className="text-sm text-blue-700 mb-2">
              {calendarEvents.length} events found
            </p>
            <button
              type="button"
              onClick={stubFromCalendar}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              Stub into Morning Section
            </button>
          </div>
        )}

        {calendarEvents.length === 0 && !fetchingCalendar && (
          <p className="text-sm text-blue-600">
            Click &quot;Fetch Events&quot; to pull today&apos;s calendar
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Highlights (High)
          </label>
          <textarea
            value={highlightsHigh}
            onChange={(e) => setHighlightsHigh(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Highlights (Low)
          </label>
          <textarea
            value={highlightsLow}
            onChange={(e) => setHighlightsLow(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Morning
        </label>
        <textarea
          value={morning}
          onChange={(e) => setMorning(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Afternoon
        </label>
        <textarea
          value={afternoon}
          onChange={(e) => setAfternoon(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Night
        </label>
        <textarea
          value={night}
          onChange={(e) => setNight(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            P Score (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={pScore}
            onChange={(e) => setPScore(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            L Score (1-10)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={lScore}
            onChange={(e) => setLScore(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight
          </label>
          <input
            type="number"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagToggle(tag.id)}
              className={`px-3 py-1 rounded-md text-sm ${
                tags.has(tag.id)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Add Tag
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : entry ? 'Update Entry' : 'Create Entry'}
        </button>
        <Link
          href="/entries"
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-center"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
