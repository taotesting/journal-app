'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { MapPin, Maximize2, Clock } from 'lucide-react'
import Link from 'next/link'
import type { ParsedBullet } from '@/lib/parse-bullets'
import { findBulletsAtTime, getBulletTimeRange } from '@/lib/parse-bullets'

export interface PlaceVisit {
  name: string
  address: string
  lat: number
  lng: number
  startTime: string
  endTime: string
  duration: number
}

interface TimelineWidgetProps {
  date: string
  places: PlaceVisit[]
  bullets: ParsedBullet[]
  compact?: boolean
}

// Timeline runs from 6am to 11pm (17 hours)
const TIMELINE_START_HOUR = 6
const TIMELINE_END_HOUR = 23
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR

// Color palette for locations
const LOCATION_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-orange-500',
  'bg-pink-500',
]

function getLocationColor(index: number): string {
  return LOCATION_COLORS[index % LOCATION_COLORS.length]
}

/**
 * Convert a Date or ISO string to percentage position on timeline
 */
function timeToPercent(time: Date | string): number {
  const date = typeof time === 'string' ? new Date(time) : time
  const hours = date.getHours() + date.getMinutes() / 60
  const percent = ((hours - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100
  return Math.max(0, Math.min(100, percent))
}

/**
 * Convert percentage position to time
 */
function percentToTime(percent: number, baseDate: Date): Date {
  const hours = TIMELINE_START_HOUR + (percent / 100) * TIMELINE_HOURS
  const result = new Date(baseDate)
  result.setHours(Math.floor(hours), Math.round((hours % 1) * 60), 0, 0)
  return result
}

/**
 * Format time for display
 */
function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export default function TimelineWidget({
  date,
  places,
  bullets,
  compact = true,
}: TimelineWidgetProps) {
  const [scrubPosition, setScrubPosition] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  // Manual overrides when clicking on bullets/locations directly
  const [manualBulletIndex, setManualBulletIndex] = useState<number | null>(null)
  const [manualLocationIndex, setManualLocationIndex] = useState<number | null>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const baseDate = useMemo(() => new Date(date + 'T00:00:00'), [date])

  // Calculate current time for indicator
  const currentTime = useMemo(() => {
    const now = new Date()
    const today = new Date().toISOString().split('T')[0]
    if (date === today) {
      return timeToPercent(now)
    }
    return null
  }, [date])

  // Derive active bullet/location from scrub position (using useMemo instead of useEffect)
  const { activeBulletIndex, activeLocationIndex } = useMemo(() => {
    // If there's a manual override, use that
    if (manualBulletIndex !== null || manualLocationIndex !== null) {
      return {
        activeBulletIndex: manualBulletIndex,
        activeLocationIndex: manualLocationIndex,
      }
    }

    if (scrubPosition === null) {
      return { activeBulletIndex: null, activeLocationIndex: null }
    }

    const scrubTime = percentToTime(scrubPosition, baseDate)

    // Find matching bullets
    const matchingBullets = findBulletsAtTime(bullets, scrubTime)
    const bulletIdx = matchingBullets.length > 0 ? matchingBullets[0].index : null

    // Find matching location
    const scrubMs = scrubTime.getTime()
    const locationIdx = places.findIndex(place => {
      const start = new Date(place.startTime).getTime()
      const end = new Date(place.endTime).getTime()
      return scrubMs >= start && scrubMs <= end
    })

    return {
      activeBulletIndex: bulletIdx,
      activeLocationIndex: locationIdx >= 0 ? locationIdx : null,
    }
  }, [scrubPosition, bullets, places, baseDate, manualBulletIndex, manualLocationIndex])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!timelineRef.current) return
    setIsDragging(true)
    // Clear manual overrides when scrubbing
    setManualBulletIndex(null)
    setManualLocationIndex(null)
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const percent = ((e.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [isDragging])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Handle touch events
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!timelineRef.current) return
    // Clear manual overrides when scrubbing
    setManualBulletIndex(null)
    setManualLocationIndex(null)
    const rect = timelineRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const percent = ((touch.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    const percent = ((touch.clientX - rect.left) / rect.width) * 100
    setScrubPosition(Math.max(0, Math.min(100, percent)))
  }, [])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Click on a bullet to jump to its time
  const handleBulletClick = useCallback((bullet: ParsedBullet) => {
    const [start] = getBulletTimeRange(bullet)
    setScrubPosition(timeToPercent(start))
    setManualBulletIndex(bullet.index)
    setManualLocationIndex(null)
  }, [])

  // Click on a location to jump to it
  const handleLocationClick = useCallback((index: number) => {
    const place = places[index]
    if (!place) return
    setScrubPosition(timeToPercent(place.startTime))
    setManualLocationIndex(index)
    setManualBulletIndex(null)
  }, [places])

  // Time labels for the timeline
  const timeLabels = [6, 9, 12, 15, 18, 21]

  if (places.length === 0 && bullets.length === 0) {
    return null
  }

  return (
    <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-700">
          <MapPin className="w-4 h-4" />
          <span className="font-medium text-sm">Timeline</span>
          {places.length > 0 && (
            <span className="text-xs text-zinc-400">
              {places.length} location{places.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {!compact && (
          <Link
            href={`/entries/${date}/timeline`}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Timeline Scrubber */}
      <div className="px-4 py-4">
        {/* Time Labels */}
        <div className="flex justify-between text-xs text-zinc-400 mb-2 px-0.5">
          {timeLabels.map(hour => (
            <span key={hour}>
              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
            </span>
          ))}
        </div>

        {/* Timeline Track */}
        <div
          ref={timelineRef}
          className="relative h-10 bg-zinc-100 rounded-lg cursor-pointer select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Location bars */}
          {places.map((place, index) => {
            const startPercent = timeToPercent(place.startTime)
            const endPercent = timeToPercent(place.endTime)
            const width = Math.max(endPercent - startPercent, 2)
            const isActive = activeLocationIndex === index

            return (
              <div
                key={`${place.name}-${index}`}
                className={`absolute top-1 bottom-1 rounded transition-all ${getLocationColor(index)} ${
                  isActive ? 'ring-2 ring-offset-1 ring-zinc-900 opacity-100' : 'opacity-70 hover:opacity-90'
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${width}%`,
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleLocationClick(index)
                }}
                title={`${place.name}\n${formatTime(place.startTime)} - ${formatTime(place.endTime)}`}
              />
            )
          })}

          {/* Current time indicator (if today) */}
          {currentTime !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
              style={{ left: `${currentTime}%` }}
            />
          )}

          {/* Scrub indicator */}
          {scrubPosition !== null && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-zinc-900 z-20"
              style={{ left: `${scrubPosition}%` }}
            >
              {/* Scrub handle */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-900 rounded-full shadow" />
              {/* Time tooltip */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-medium text-zinc-700 whitespace-nowrap">
                {formatTime(percentToTime(scrubPosition, baseDate))}
              </div>
            </div>
          )}
        </div>

        {/* Location Legend (below timeline) */}
        {places.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-2">
            {places.map((place, index) => {
              const isActive = activeLocationIndex === index
              return (
                <button
                  key={`${place.name}-${index}`}
                  onClick={() => handleLocationClick(index)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-all ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${getLocationColor(index)}`} />
                  <span className="truncate max-w-[120px]">{place.name}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Bullets Section */}
      {bullets.length > 0 && compact && (
        <div className="px-4 pb-4 border-t border-zinc-100 pt-3 max-h-48 overflow-y-auto">
          <div className="space-y-1">
            {bullets.slice(0, 8).map((bullet) => {
              const isActive = activeBulletIndex === bullet.index
              const hasTime = bullet.timeStart !== undefined
              const [timeStart] = getBulletTimeRange(bullet)

              return (
                <button
                  key={bullet.index}
                  onClick={() => handleBulletClick(bullet)}
                  className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-zinc-900 text-white'
                      : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                    isActive ? 'bg-white' : hasTime ? 'bg-zinc-900' : 'bg-zinc-300'
                  }`} />
                  <div className="min-w-0 flex-1">
                    {hasTime && (
                      <span className={`text-xs mr-1.5 ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>
                        {formatTime(timeStart)}
                      </span>
                    )}
                    <span className="text-sm truncate">{bullet.text}</span>
                  </div>
                </button>
              )
            })}
            {bullets.length > 8 && (
              <div className="text-xs text-zinc-400 text-center pt-1">
                +{bullets.length - 8} more items
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active Location Details */}
      {activeLocationIndex !== null && places[activeLocationIndex] && (
        <div className="px-4 pb-4 border-t border-zinc-100 pt-3">
          <div className="flex items-start gap-2">
            <div className={`w-3 h-3 rounded-full mt-0.5 ${getLocationColor(activeLocationIndex)}`} />
            <div className="min-w-0">
              <div className="font-medium text-zinc-900">
                {places[activeLocationIndex].name}
              </div>
              {places[activeLocationIndex].address && (
                <div className="text-sm text-zinc-500 truncate">
                  {places[activeLocationIndex].address}
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                <Clock className="w-3 h-3" />
                {formatTime(places[activeLocationIndex].startTime)} - {formatTime(places[activeLocationIndex].endTime)}
                <span className="text-zinc-300 mx-1">·</span>
                {places[activeLocationIndex].duration} min
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
