# Journal App Feature Roadmap

## Phase 1: Core Experience (This Sprint)

### 1.1 Entry Search & Filter
**Priority:** HIGH
**Value:** Find entries fast, filter by date/tags/scores
```
- Add search bar to /entries page
- Filter by date range (quick: today, week, month)
- Filter by score range (p-score, l-score)
- Filter by tags (multi-select)
- URL params for shareable filtered views
```

### 1.2 Export to CSV
**Priority:** HIGH  
**Value:** Backup data, analyze in Excel
```
- API route: GET /api/entries/export
- Download all entries as CSV
- Include: date, scores, weight, tags, highlights
- Client: download button on entries page
```

### 1.3 Tag Management
**Priority:** MEDIUM
**Value:** Better organization, discoverability
```
- Show tag usage counts
- Auto-suggest tags when typing
- Click tag to filter entries
- Tag management page (rename, merge, delete)
```

### 1.4 Streak Tracking
**Priority:** MEDIUM
**Value:** Gamification, consistency
```
- Database function to calculate streaks
- Show current streak on dashboard
- Best streak history
- "Entries this week" widget
```

---

## Phase 2: Integrations

### 2.1 Oura Ring Integration
**Priority:** MEDIUM
**Value:** Correlate sleep/recovery with scores
```
- Oura Cloud API integration
- Sync: sleep score, HRV, resting HR, sleep duration
- Display Oura data on entry card
- Show correlation analysis
```

### 2.2 Google Maps Location
**Priority:** LOW
**Value:** Context for where you were
```
- Add location picker to entry form
- Reverse geocode to city/place name
- Show entry location on mini-map
- Filter by location
```

### 2.3 Spotify/Apple Music
**Priority:** LOW
**Value:** Track what you listened to
```
- Embed "What I listened to today" section
- Link to music preferences in settings
- Optional: last.fm scrobble integration
```

---

## Phase 3: Analytics & Insights

### 3.1 Weekly Dashboard
**Priority:** MEDIUM
**Value:** See patterns, progress
```
- Weekly averages (p-score, l-score, weight)
- Trends chart (last 30 days)
- Tag frequency breakdown
- Entries per day histogram
```

### 3.2 Correlation Analysis
**Priority:** LOW
**Value:** Understand what affects scores
```
- Correlate: sleep → p-score, weight → l-score
- Time of day → content quality
- Tags → score patterns
- Visual scatter plots
```

### 3.3 AI Insights (Future)
**Priority:** EXPERIMENTAL
**Value:** Summarize patterns, suggestions
```
- Weekly AI summary
- "Your week in review"
- Suggestions based on patterns
```

---

## Phase 4: UX Improvements

### 4.1 Mobile App Polish
**Priority:** MEDIUM
**Value:** Better native experience
- PWA manifest for installability
- Offline support with service worker
- Better touch interactions
- Push notifications (optional)

### 4.2 Entry Templates
**Priority:** LOW
**Value:** Faster entry creation
- Morning routine template
- Travel template
- Workout logging template

### 4.3 Sharing
**Priority:** LOW
**Value:** Share insights
- Generate shareable entry summaries
- Privacy controls per entry
- Export to Notion/Obsidian

---

## Quick Wins (Under $2)
1. CSV Export - 2 hours
2. Search/Filter - 3 hours  
3. Streak Tracking - 2 hours
4. Weekly Widget - 2 hours
