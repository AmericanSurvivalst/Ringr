import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BarChart3, TrendingUp, TrendingDown, Minus, PhoneCall, Calendar, Clock } from 'lucide-react'
import { formatDuration, formatMinutes } from '@/lib/utils'

export default async function AnalyticsPage() {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) redirect('/onboarding')

  // Get last 30 days of analytics
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: analytics } = await supabase
    .from('call_analytics')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Calculate totals
  const totals = analytics?.reduce((acc, day) => ({
    calls: acc.calls + day.total_calls,
    answered: acc.answered + day.answered_calls,
    appointments: acc.appointments + day.appointments_booked,
    duration: acc.duration + day.total_duration_seconds,
  }), { calls: 0, answered: 0, appointments: 0, duration: 0 }) || { calls: 0, answered: 0, appointments: 0, duration: 0 }

  // Calculate week-over-week change
  const thisWeek = analytics?.slice(0, 7) || []
  const lastWeek = analytics?.slice(7, 14) || []

  const thisWeekCalls = thisWeek.reduce((sum, d) => sum + d.total_calls, 0)
  const lastWeekCalls = lastWeek.reduce((sum, d) => sum + d.total_calls, 0)
  const callsChange = lastWeekCalls > 0 
    ? Math.round(((thisWeekCalls - lastWeekCalls) / lastWeekCalls) * 100) 
    : 0

  const thisWeekApts = thisWeek.reduce((sum, d) => sum + d.appointments_booked, 0)
  const lastWeekApts = lastWeek.reduce((sum, d) => sum + d.appointments_booked, 0)
  const aptsChange = lastWeekApts > 0 
    ? Math.round(((thisWeekApts - lastWeekApts) / lastWeekApts) * 100) 
    : 0

  const TrendIcon = ({ value }: { value: number }) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-gray-600">Performance metrics for the last 30 days</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <PhoneCall className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon value={callsChange} />
              <span className={callsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {callsChange > 0 ? '+' : ''}{callsChange}%
              </span>
            </div>
          </div>
          <p className="stat-value">{totals.calls.toLocaleString()}</p>
          <p className="stat-label">Total Calls</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <div className="flex items-center gap-1 text-sm">
              <TrendIcon value={aptsChange} />
              <span className={aptsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {aptsChange > 0 ? '+' : ''}{aptsChange}%
              </span>
            </div>
          </div>
          <p className="stat-value">{totals.appointments.toLocaleString()}</p>
          <p className="stat-label">Appointments Booked</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="stat-value">{formatMinutes(Math.round(totals.duration / 60))}</p>
          <p className="stat-label">Total Talk Time</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="stat-value">
            {totals.calls > 0 
              ? Math.round((totals.answered / totals.calls) * 100) 
              : 100}%
          </p>
          <p className="stat-label">Answer Rate</p>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="card">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Daily Breakdown</h2>
        </div>
        
        {analytics && analytics.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Calls</th>
                  <th>Answered</th>
                  <th>Appointments</th>
                  <th>Avg Duration</th>
                  <th>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {analytics.map((day) => (
                  <tr key={day.id}>
                    <td>
                      <span className="font-medium">
                        {new Date(day.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>{day.total_calls}</td>
                    <td>
                      <span className="text-green-600">{day.answered_calls}</span>
                      {day.missed_calls > 0 && (
                        <span className="text-red-500 ml-1">
                          / {day.missed_calls} missed
                        </span>
                      )}
                    </td>
                    <td>
                      {day.appointments_booked > 0 ? (
                        <span className="badge badge-success">{day.appointments_booked}</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-sm">
                        {formatDuration(day.avg_duration_seconds)}
                      </span>
                    </td>
                    <td>
                      <span className="text-gray-600">
                        {formatMinutes(Math.round(day.total_duration_seconds / 60))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state py-16">
            <BarChart3 className="empty-state-icon" />
            <p className="empty-state-title">No data yet</p>
            <p className="empty-state-description">
              Analytics will appear here once you start receiving calls
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
