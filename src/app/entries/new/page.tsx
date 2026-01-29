import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import EntryForm from '@/components/EntryForm'

export default async function NewEntryPage() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: tags } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  const today = format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">New Entry</h1>
        <EntryForm 
          initialDate={today}
          availableTags={tags || []}
          userId={user.id}
        />
      </div>
    </div>
  )
}
