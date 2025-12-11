import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Calendar, Clock, MapPin, Phone, User } from 'lucide-react'
import { formatPhoneNumber, getStatusColor } from '@/lib/utils'

export default async function AppointmentsPage() {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) redirect('/onboarding')

  const now = new Date().toISOString()

  // Get upcoming appointments
  const { data: upcoming } = await supabase
    .from('appointments')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })

  // Get past appointments
  const { data: past } = await supabase
    .from('appointments')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .lt('scheduled_at', now)
    .order('scheduled_at', { ascending: false })
    .limit(20)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-gray-600">Appointments booked by your AI agent</p>
      </div>

      {/* Upcoming Appointments */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
        {upcoming && upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcoming.map((apt) => (
              <div key={apt.id} className="card p-5 card-hover">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{apt.customer_name}</p>
                      <p className="text-sm text-gray-500">
                        {formatPhoneNumber(apt.customer_phone)}
                      </p>
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(apt.status)}`}>
                    {apt.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(apt.scheduled_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    {new Date(apt.scheduled_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {apt.duration_minutes && (
                      <span className="text-gray-400">
                        ({apt.duration_minutes} min)
                      </span>
                    )}
                  </div>
                  {apt.service_type && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="w-4 h-4 flex items-center justify-center">🔧</span>
                      {apt.service_type}
                    </div>
                  )}
                  {apt.customer_address && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span className="line-clamp-2">{apt.customer_address}</span>
                    </div>
                  )}
                </div>

                {apt.notes && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-500">
                    {apt.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <div className="empty-state py-12">
              <Calendar className="empty-state-icon" />
              <p className="empty-state-title">No upcoming appointments</p>
              <p className="empty-state-description">
                Appointments booked by your AI agent will show up here
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Past Appointments */}
      {past && past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Past</h2>
          <div className="card">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {past.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <div>
                          <p className="font-medium">{apt.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatPhoneNumber(apt.customer_phone)}
                          </p>
                        </div>
                      </td>
                      <td>{apt.service_type || '—'}</td>
                      <td>
                        <span className="text-sm text-gray-500">
                          {new Date(apt.scheduled_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusColor(apt.status)}`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
