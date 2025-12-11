import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Phone, Clock, Calendar, Play, 
  MessageSquare, Bot, User, TrendingUp 
} from 'lucide-react'
import { formatDuration, formatPhoneNumber, formatDateTime, getOutcomeLabel, getOutcomeColor, getSentimentColor } from '@/lib/utils'

export default async function CallDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createServerSupabaseClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) redirect('/onboarding')

  // Get call with transcript
  const { data: call } = await supabase
    .from('calls')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', userData.organization_id)
    .single()

  if (!call) notFound()

  // Get transcript
  const { data: transcript } = await supabase
    .from('transcripts')
    .select('*')
    .eq('call_id', call.id)
    .single()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          href="/dashboard/calls"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Call Details</h1>
          <p className="text-gray-600">
            {call.caller_name || formatPhoneNumber(call.caller_phone)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Transcript */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recording Player */}
          {call.recording_url && (
            <div className="card p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Play className="w-5 h-5" />
                Recording
              </h2>
              <audio 
                controls 
                className="w-full"
                src={call.recording_url}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Transcript */}
          <div className="card">
            <div className="p-6 border-b border-gray-100">
              <h2 className="font-semibold flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Transcript
              </h2>
            </div>
            
            {transcript && transcript.messages?.length > 0 ? (
              <div className="p-6 space-y-4">
                {transcript.messages.map((msg: any, i: number) => (
                  <div 
                    key={i}
                    className={`flex gap-3 ${msg.role === 'ai' ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'ai' ? 'bg-primary/10' : 'bg-gray-100'
                    }`}>
                      {msg.role === 'ai' ? (
                        <Bot className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-gray-500" />
                      )}
                    </div>
                    <div className={`flex-1 ${msg.role === 'ai' ? '' : 'text-right'}`}>
                      <p className="text-xs text-gray-500 mb-1">
                        {msg.role === 'ai' ? 'Ringr' : 'Caller'}
                      </p>
                      <div className={`inline-block px-4 py-2 rounded-2xl ${
                        msg.role === 'ai' 
                          ? 'bg-gray-100 text-gray-800' 
                          : 'bg-primary text-white'
                      }`}>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-12">
                <MessageSquare className="empty-state-icon" />
                <p className="empty-state-title">No transcript available</p>
                <p className="empty-state-description">
                  The transcript for this call hasn't been processed yet
                </p>
              </div>
            )}
          </div>

          {/* AI Summary */}
          {call.summary && (
            <div className="card p-6">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                AI Summary
              </h2>
              <p className="text-gray-600">{call.summary}</p>
            </div>
          )}
        </div>

        {/* Sidebar - Call Info */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <h2 className="font-semibold">Call Information</h2>
            
            <div>
              <p className="text-sm text-gray-500 mb-1">Caller</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium">
                    {call.caller_name || 'Unknown'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPhoneNumber(call.caller_phone)}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Date & Time</p>
              <div className="flex items-center gap-2 text-gray-900">
                <Calendar className="w-4 h-4 text-gray-400" />
                {formatDateTime(call.created_at)}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Duration</p>
              <div className="flex items-center gap-2 text-gray-900">
                <Clock className="w-4 h-4 text-gray-400" />
                {formatDuration(call.duration_seconds)}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Outcome</p>
              {call.outcome ? (
                <span className={`badge ${getOutcomeColor(call.outcome)}`}>
                  {getOutcomeLabel(call.outcome)}
                </span>
              ) : (
                <span className="text-gray-400">Not classified</span>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Sentiment</p>
              {call.sentiment ? (
                <span className={`font-medium capitalize ${getSentimentColor(call.sentiment)}`}>
                  {call.sentiment}
                </span>
              ) : (
                <span className="text-gray-400">Not analyzed</span>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Direction</p>
              <span className="capitalize">{call.direction}</span>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-1">Status</p>
              <span className="capitalize">{call.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
