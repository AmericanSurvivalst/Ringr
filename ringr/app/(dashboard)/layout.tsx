import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar, TopBar } from '@/components/dashboard'
import type { AccountStatus } from '@/lib/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Get user with organization
  const { data: userData } = await supabase
    .from('users')
    .select(`
      *,
      organization:organizations(
        *,
        plan:plans(*)
      )
    `)
    .eq('id', user.id)
    .single()

  if (!userData?.organization) {
    redirect('/onboarding')
  }

  // Get account status
  const { data: accountStatus } = await supabase
    .rpc('get_account_status', { org_id: userData.organization.id })

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <TopBar 
          accountStatus={accountStatus as AccountStatus}
          userName={userData.full_name || userData.email}
          orgName={userData.organization.name}
        />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
