import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Phone, Play, FileText, ChevronRight } from 'lucide-react'
import { formatDuration, formatRelativeTime, formatPhoneNumber, getOutcomeLabel, getOutcomeColor, getSentimentIcon } from '@/lib/utils'

export default async function CallsPage() {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) redirect('/onboarding')

  const { data: calls } = await supabase
    .from('calls')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calls</h1>
          <p className="text-gray-600">View and manage all your calls</p>
        </div>
      </div>

      {/* Calls Table */}
      <div className="card">
        {calls && calls.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Caller</th>
                  <th>Duration</th>
                  <th>Outcome</th>
                  <th>Sentiment</th>
                  <th>Time</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center">
                          <Phone className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {call.caller_name || formatPhoneNumber(call.caller_phone)}
                          </p>
                          {call.caller_name && (
                            <p className="text-sm text-gray-500">
                              {formatPhoneNumber(call.caller_phone)}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-sm">
                        {formatDuration(call.duration_seconds)}
                      </span>
                    </td>
                    <td>
                      {call.outcome ? (
                        <span className={`badge ${getOutcomeColor(call.outcome)}`}>
                          {getOutcomeLabel(call.outcome)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      {call.sentiment ? (
                        <span className="text-lg" title={call.sentiment}>
                          {getSentimentIcon(call.sentiment)}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-500">
                        {formatRelativeTime(call.created_at)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 justify-end">
                        {call.recording_url && (
                          <a
                            href={call.recording_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Play recording"
                          >
                            <Play className="w-4 h-4" />
                          </a>
                        )}
                        <Link
                          href={`/dashboard/calls/${call.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state py-16">
            <Phone className="empty-state-icon" />
            <p className="empty-state-title">No calls yet</p>
            <p className="empty-state-description">
              When your AI agent starts taking calls, they'll appear here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
