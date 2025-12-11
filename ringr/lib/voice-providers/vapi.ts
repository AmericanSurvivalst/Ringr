import crypto from 'crypto'
import type { VoiceProviderAdapter, VoiceProviderWebhookPayload, CallEventData, WebhookEventType, TranscriptMessage } from './types'

// Vapi webhook event types
type VapiEventType = 
  | 'call-started'
  | 'call-ended'
  | 'transcript'
  | 'hang'
  | 'speech-update'
  | 'function-call'
  | 'end-of-call-report'

interface VapiWebhookPayload {
  type: VapiEventType
  call?: {
    id: string
    assistantId?: string
    phoneNumberId?: string
    type: 'inbound' | 'outbound'
    customer?: {
      number?: string
      name?: string
    }
    startedAt?: string
    endedAt?: string
    status?: string
    recordingUrl?: string
  }
  transcript?: string
  messages?: Array<{
    role: 'assistant' | 'user' | 'system'
    message: string
    time?: number
  }>
  summary?: string
  analysis?: {
    sentiment?: string
    outcome?: string
  }
}

function mapVapiEventType(vapiType: VapiEventType): WebhookEventType | null {
  const mapping: Record<VapiEventType, WebhookEventType | null> = {
    'call-started': 'call.started',
    'call-ended': 'call.ended',
    'transcript': 'transcript.partial',
    'end-of-call-report': 'transcript.final',
    'hang': 'call.failed',
    'speech-update': null,
    'function-call': 'function.called',
  }
  return mapping[vapiType]
}

function parseVapiCallData(payload: VapiWebhookPayload): CallEventData {
  const call = payload.call
  
  // Calculate duration
  let durationSeconds: number | undefined
  if (call?.startedAt && call?.endedAt) {
    durationSeconds = Math.round(
      (new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000
    )
  }

  // Map transcript messages
  const messages: TranscriptMessage[] = (payload.messages || []).map(msg => ({
    role: msg.role === 'assistant' ? 'ai' : msg.role === 'user' ? 'user' : 'system',
    content: msg.message,
    timestamp: msg.time ? new Date(msg.time).toISOString() : undefined,
  }))

  // Determine status
  let status: CallEventData['status'] = 'in_progress'
  if (payload.type === 'call-ended' || payload.type === 'end-of-call-report') {
    status = 'completed'
  } else if (payload.type === 'hang') {
    status = 'failed'
  }

  return {
    callId: call?.id || '',
    agentId: call?.assistantId,
    direction: call?.type || 'inbound',
    callerPhone: call?.customer?.number,
    callerName: call?.customer?.name,
    startedAt: call?.startedAt ? new Date(call.startedAt) : new Date(),
    endedAt: call?.endedAt ? new Date(call.endedAt) : undefined,
    durationSeconds,
    status,
    recordingUrl: call?.recordingUrl,
    transcript: messages.length > 0 ? { messages } : undefined,
    summary: payload.summary,
    sentiment: payload.analysis?.sentiment as CallEventData['sentiment'],
    outcome: payload.analysis?.outcome,
    metadata: { raw: payload },
  }
}

export const vapiAdapter: VoiceProviderAdapter = {
  name: 'vapi',

  parseWebhook(body: unknown, headers: Record<string, string>): VoiceProviderWebhookPayload | null {
    const payload = body as VapiWebhookPayload
    
    if (!payload.type) {
      console.error('Vapi webhook missing type')
      return null
    }

    const eventType = mapVapiEventType(payload.type)
    if (!eventType) {
      // Event type not relevant, skip
      return null
    }

    return {
      eventType,
      callData: parseVapiCallData(payload),
      rawPayload: payload,
    }
  },

  verifySignature(body: string, signature: string): boolean {
    const secret = process.env.VAPI_WEBHOOK_SECRET
    if (!secret) {
      console.warn('VAPI_WEBHOOK_SECRET not set, skipping signature verification')
      return true
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex')
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch (error) {
      console.error('Vapi signature verification failed:', error)
      return false
    }
  },
}
