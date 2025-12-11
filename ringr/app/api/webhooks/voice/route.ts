import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { getVoiceProviderAdapter } from '@/lib/voice-providers'

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const provider = searchParams.get('provider') || 'vapi'

  // Get the appropriate adapter
  const adapter = getVoiceProviderAdapter(provider)
  if (!adapter) {
    console.error(`Unknown voice provider: ${provider}`)
    return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
  }

  // Get raw body for signature verification
  const rawBody = await request.text()
  const headersList = headers()
  const headersObj: Record<string, string> = {}
  headersList.forEach((value, key) => {
    headersObj[key] = value
  })

  // Verify signature
  const signature = headersObj['x-vapi-signature'] || headersObj['x-webhook-signature'] || ''
  if (!adapter.verifySignature(rawBody, signature)) {
    console.error('Webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Parse webhook payload
  let body: unknown
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const webhookData = adapter.parseWebhook(body, headersObj)
  if (!webhookData) {
    // Event type not relevant, acknowledge and skip
    return NextResponse.json({ received: true })
  }

  const { eventType, callData } = webhookData
  const supabase = createServiceClient()

  try {
    // Find the agent and organization by voice provider agent ID
    const { data: agent } = await supabase
      .from('agents')
      .select('id, organization_id')
      .eq('voice_provider_agent_id', callData.agentId)
      .single()

    if (!agent) {
      console.warn(`Agent not found for voice provider ID: ${callData.agentId}`)
      return NextResponse.json({ received: true })
    }

    const orgId = agent.organization_id

    // Check if organization can make calls
    const { data: canMakeCalls } = await supabase
      .rpc('can_make_calls', { org_id: orgId })

    if (!canMakeCalls && eventType === 'call.started') {
      console.warn(`Organization ${orgId} cannot make calls - locked or over limit`)
      // You might want to handle this differently (e.g., transfer to voicemail)
    }

    switch (eventType) {
      case 'call.started': {
        // Create new call record
        const { error } = await supabase
          .from('calls')
          .insert({
            organization_id: orgId,
            agent_id: agent.id,
            external_call_id: callData.callId,
            direction: callData.direction,
            status: 'in_progress',
            caller_phone: callData.callerPhone,
            caller_name: callData.callerName,
            started_at: callData.startedAt.toISOString(),
          })

        if (error) console.error('Failed to create call:', error)
        break
      }

      case 'call.ended':
      case 'transcript.final': {
        // Update call with final data
        const updateData: Record<string, unknown> = {
          status: 'completed',
          ended_at: callData.endedAt?.toISOString(),
          duration_seconds: callData.durationSeconds,
          recording_url: callData.recordingUrl,
          summary: callData.summary,
          sentiment: callData.sentiment,
          outcome: callData.outcome,
        }

        // Get the call ID first
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id')
          .eq('external_call_id', callData.callId)
          .single()

        if (existingCall) {
          // Update call
          await supabase
            .from('calls')
            .update(updateData)
            .eq('id', existingCall.id)

          // Save transcript if available
          if (callData.transcript?.messages.length) {
            await supabase
              .from('transcripts')
              .upsert({
                call_id: existingCall.id,
                messages: callData.transcript.messages,
              }, {
                onConflict: 'call_id',
              })
          }

          // Update usage (minutes)
          if (callData.durationSeconds) {
            const minutes = Math.ceil(callData.durationSeconds / 60)
            await supabase.rpc('increment_usage', { 
              org_id: orgId, 
              minutes 
            })
          }

          // Update daily analytics
          const today = new Date().toISOString().split('T')[0]
          const appointmentBooked = callData.outcome === 'appointment_booked' ? 1 : 0

          // Upsert analytics
          const { data: existingAnalytics } = await supabase
            .from('call_analytics')
            .select('*')
            .eq('organization_id', orgId)
            .eq('date', today)
            .single()

          if (existingAnalytics) {
            const totalDuration = existingAnalytics.total_duration_seconds + (callData.durationSeconds || 0)
            const totalCalls = existingAnalytics.total_calls + 1
            
            await supabase
              .from('call_analytics')
              .update({
                total_calls: totalCalls,
                answered_calls: existingAnalytics.answered_calls + 1,
                appointments_booked: existingAnalytics.appointments_booked + appointmentBooked,
                total_duration_seconds: totalDuration,
                avg_duration_seconds: Math.round(totalDuration / totalCalls),
              })
              .eq('id', existingAnalytics.id)
          } else {
            await supabase
              .from('call_analytics')
              .insert({
                organization_id: orgId,
                date: today,
                total_calls: 1,
                answered_calls: 1,
                appointments_booked: appointmentBooked,
                total_duration_seconds: callData.durationSeconds || 0,
                avg_duration_seconds: callData.durationSeconds || 0,
              })
          }
        }
        break
      }

      case 'call.failed': {
        await supabase
          .from('calls')
          .update({ status: 'failed' })
          .eq('external_call_id', callData.callId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Voice webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
