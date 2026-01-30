import { createServerSupabase } from '@/lib/supabase-server'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function SettingsPage() {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <Link
            href="/entries"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Back to Entries
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations</h2>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Google Calendar</h3>
                    <p className="text-sm text-gray-500">
                      Sync your calendar events for auto-stubbing entries
                    </p>
                  </div>
                  <span className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-full">
                    Connected
                  </span>
                </div>
              </div>

              <div className="border rounded-lg p-4 opacity-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Google Maps</h3>
                    <p className="text-sm text-gray-500">
                      Track places you visit (coming soon)
                    </p>
                  </div>
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>

              <div className="border rounded-lg p-4 opacity-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Oura Ring</h3>
                    <p className="text-sm text-gray-500">
                      Sync sleep and health metrics (coming soon)
                    </p>
                  </div>
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t">
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  )
}
