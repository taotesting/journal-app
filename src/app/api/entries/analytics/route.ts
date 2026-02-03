import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get all entries for analytics
  const { data: entries, error } = await supabase
    .from('entries')
    .select('date, p_score, l_score, weight')
    .eq('user_id', user.id)
    .order('date', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!entries || entries.length === 0) {
    return NextResponse.json({
      streak: 0,
      bestStreak: 0,
      totalEntries: 0,
      weeklyAverages: null,
      monthlyData: null
    })
  }

  // Calculate streaks
  let currentStreak = 0
  let bestStreak = 0
  let tempStreak = 1
  let bestStreakStart = ''

  const sortedDates = entries.map(e => e.date).sort((a, b) => 
    new Date(a!).getTime() - new Date(b!).getTime()
  )

  // Check if today has an entry
  const today = new Date().toISOString().split('T')[0]
  const hasToday = sortedDates.includes(today)

  // Calculate consecutive days
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1]!)
    const curr = new Date(sortedDates[i]!)
    const diffDays = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      tempStreak++
    } else if (diffDays > 1) {
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak
        bestStreakStart = sortedDates[i - tempStreak]!
      }
      tempStreak = 1
    }
  }

  // Check final streak
  if (tempStreak > bestStreak) {
    bestStreak = tempStreak
    bestStreakStart = sortedDates[sortedDates.length - tempStreak]!
  }

  // Current streak (counting from most recent entry)
  const mostRecent = sortedDates[sortedDates.length - 1]
  if (mostRecent) {
    const daysSinceRecent = Math.floor((new Date(today).getTime() - new Date(mostRecent!).getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceRecent <= 1) {
      // Count backwards from most recent
      currentStreak = 1
      for (let i = sortedDates.length - 1; i > 0; i--) {
        const prev = new Date(sortedDates[i]!)
        const curr = new Date(sortedDates[i - 1]!)
        const diffDays = Math.floor((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays === 1) {
          currentStreak++
        } else {
          break
        }
      }
    }
  }

  // Weekly averages (last 4 weeks)
  const now = new Date()
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)
  
  interface WeekData {
    week: string
    avgP: number
    avgL: number
    count: number
    sumP: number
    sumL: number
  }
  
  const weeklyAverages: Record<string, WeekData> = {}
  
  entries.forEach(entry => {
    if (entry.date && entry.date >= fourWeeksAgo.toISOString().split('T')[0]) {
      const date = new Date(entry.date!)
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      
      if (!weeklyAverages[weekKey]) {
        weeklyAverages[weekKey] = { week: weekKey, avgP: 0, avgL: 0, count: 0, sumP: 0, sumL: 0 }
      }
      const week = weeklyAverages[weekKey]
      if (entry.p_score) week.sumP += entry.p_score
      if (entry.l_score) week.sumL += entry.l_score
      week.count++
    }
  })

  const formattedWeekly = Object.values(weeklyAverages)
    .map(w => ({
      week: w.week,
      avgP: w.count > 0 ? Math.round((w.sumP / w.count) * 10) / 10 : 0,
      avgL: w.count > 0 ? Math.round((w.sumL / w.count) * 10) / 10 : 0,
      count: w.count
    }))
    .sort((a, b) => a.week.localeCompare(b.week))
    .slice(-4)

  // Monthly data for charts (last 12 months)
  interface MonthData {
    month: string
    avgP: number
    avgL: number
    count: number
    sumP: number
    sumL: number
  }
  
  const monthlyData: Record<string, MonthData> = {}
  
  entries.forEach(entry => {
    if (entry.date) {
      const month = entry.date.substring(0, 7) // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = { month, avgP: 0, avgL: 0, count: 0, sumP: 0, sumL: 0 }
      }
      const m = monthlyData[month]
      if (entry.p_score) m.sumP += entry.p_score
      if (entry.l_score) m.sumL += entry.l_score
      m.count++
    }
  })

  const formattedMonthly = Object.values(monthlyData)
    .map(m => ({
      month: m.month,
      avgP: m.count > 0 ? Math.round((m.sumP / m.count) * 10) / 10 : 0,
      avgL: m.count > 0 ? Math.round((m.sumL / m.count) * 10) / 10 : 0,
      count: m.count
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12)

  return NextResponse.json({
    streak: currentStreak,
    bestStreak,
    bestStreakStart,
    totalEntries: entries.length,
    hasToday,
    weeklyAverages: formattedWeekly,
    monthlyData: formattedMonthly,
    avgPScore: entries.reduce((acc, e) => acc + (e.p_score || 0), 0) / entries.length,
    avgLScore: entries.reduce((acc, e) => acc + (e.l_score || 0), 0) / entries.length,
    avgWeight: entries.filter(e => e.weight).reduce((acc, e) => acc + (e.weight || 0), 0) / (entries.filter(e => e.weight).length || 1)
  })
}
