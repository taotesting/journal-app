# Journal App

A personal journaling app with daily entries, tags, scores, and future integrations with Google Calendar, Google Maps, and Oura.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Run the SQL schema from `../journal-schema.sql` in the SQL Editor
   - Enable Google OAuth in Authentication > Providers
   - Copy your project URL and anon key

3. **Configure environment variables:**
   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Features

### Phase 1 (MVP) ✅
- User authentication with Google OAuth
- Create/edit/view journal entries
- Daily structure: highlights (high/low), morning/afternoon/night recounts
- P and L scores (1-10)
- Weight tracking
- Tag system with custom tags
- Responsive design

### Phase 2 (Coming Soon)
- Google Calendar integration (auto-stub entries)
- Google Maps Timeline integration
- Oura ring data sync

### Phase 3 (Analytics)
- Score trends over time
- Tag correlation analysis
- Sentiment analysis
- Health data integration

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (Google OAuth)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (recommended)
