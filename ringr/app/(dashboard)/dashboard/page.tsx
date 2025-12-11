import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  PhoneCall, Calendar, Clock, TrendingUp, 
  ArrowRight, Phone, CheckCircle2 
} from 'lucide-react'
import { formatDuration, formatRelativeTime, formatPhoneNumber, getOutcomeLabel, getOutcomeColor } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) redirect('/onboarding')

  const orgId = userData.organization_id

  // Get today's stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', today.toISOString())

  const { data: todayAppointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('organization_id', orgId)
    .gte('created_at', today.toISOString())

  // Get recent calls
  const { data: recentCalls } = await supabase
    .from('calls')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(5)

  // Get upcoming appointments
  const { data: upcomingAppointments } = await supabase
    .from('appointments')
    .select('*')
    .eq('organization_id', orgId)
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5)

  // Calculate stats
  const totalCalls = todayCalls?.length || 0
  const totalAppointments = todayAppointments?.length || 0
  const avgDuration = todayCalls?.length 
    ? Math.round(todayCalls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / todayCalls.length)
    : 0
  const answerRate = totalCalls > 0 
    ? Math.round((todayCalls?.filter(c => c.status === 'completed').length || 0) / totalCalls * 100)
    : 100

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Here's what's happening today</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Today</span>
          </div>
          <p className="stat-value">{totalCalls}</p>
          <p className="stat-label">Total Calls</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Today</span>
          </div>
          <p className="stat-value">{totalAppointments}</p>
          <p className="stat-label">Appointments Booked</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Average</span>
          </div>
          <p className="stat-value">{formatDuration(avgDuration)}</p>
          <p className="stat-label">Call Duration</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xs font-medium text-gray-500 uppercase">Rate</span>
          </div>
          <p className="stat-value">{answerRate}%</p>
          <p className="stat-label">Answer Rate</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Calls */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Recent Calls</h2>
            <Link href="/dashboard/calls" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {recentCalls && recentCalls.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentCalls.map((call) => (
                <Link 
                  key={call.id} 
                  href={`/dashboard/calls/${call.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {call.caller_name || formatPhoneNumber(call.caller_phone)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDuration(call.duration_seconds)} • {formatRelativeTime(call.created_at)}
                    </p>
                  </div>
                  {call.outcome && (
                    <span className={`badge ${getOutcomeColor(call.outcome)}`}>
                      {getOutcomeLabel(call.outcome)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <Phone className="empty-state-icon" />
              <p className="empty-state-title">No calls yet</p>
              <p className="empty-state-description">
                When your AI agent starts taking calls, they'll appear here
              </p>
            </div>
          )}
        </div>

        {/* Upcoming Appointments */}
        <div className="card">
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold">Upcoming Appointments</h2>
            <Link href="/dashboard/appointments" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {upcomingAppointments && upcomingAppointments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{apt.customer_name}</p>
                    <p className="text-sm text-gray-500">
                      {apt.service_type || 'Service call'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {new Date(apt.scheduled_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(apt.scheduled_at).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state py-12">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">No upcoming appointments</p>
              <p className="empty-state-description">
                Appointments booked by your AI agent will show up here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
