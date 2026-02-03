import { createServerSupabase } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const OURA_CLIENT_ID = process.env.OURA_CLIENT_ID
const OURA_CLIENT_SECRET = process.env.OURA_CLIENT_SECRET
const OURA_REDIRECT_URI = process.env.OURA_REDIRECT_URI || 'http://localhost:3000/api/oauth/oura/callback'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // This is the user_id

  if (!code || !state) {
    return NextResponse.redirect('/settings?error=missing_params')
  }

  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://cloud.ouraring.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: OURA_REDIRECT_URI,
        client_id: OURA_CLIENT_ID || '',
        client_secret: OURA_CLIENT_SECRET || '',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code')
    }

    const tokenData = await tokenResponse.json()

    // Save token to database
    const supabase = await createServerSupabase()
    await supabase.from('integrations').upsert({
      user_id: state,
      provider: 'oura',
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
    }, {
      onConflict: 'user_id,provider'
    })

    return NextResponse.redirect('/settings?oura=connected')
  } catch (error) {
    console.error('Oura OAuth error:', error)
    return NextResponse.redirect('/settings?error=oauth_failed')
  }
}
