// Voice Provider Types - Platform Agnostic

export type WebhookEventType =
  | 'call.started'
  | 'call.ended'
  | 'call.failed'
  | 'transcript.partial'
  | 'transcript.final'
  | 'function.called'

export interface CallEventData {
  callId: string
  agentId?: string
  direction: 'inbound' | 'outbound'
  callerPhone?: string
  callerName?: string
  startedAt: Date
  endedAt?: Date
  durationSeconds?: number
  status: 'in_progress' | 'completed' | 'failed' | 'missed'
  recordingUrl?: string
  transcript?: TranscriptData
  summary?: string
  sentiment?: 'positive' | 'neutral' | 'negative'
  outcome?: string
  metadata?: Record<string, unknown>
}

export interface TranscriptMessage {
  role: 'ai' | 'user' | 'system'
  content: string
  timestamp?: string
}

export interface TranscriptData {
  messages: TranscriptMessage[]
}

export interface VoiceProviderWebhookPayload {
  eventType: WebhookEventType
  callData: CallEventData
  rawPayload: unknown
}

export interface VoiceProviderAdapter {
  name: string
  parseWebhook(body: unknown, headers: Record<string, string>): VoiceProviderWebhookPayload | null
  verifySignature(body: string, signature: string): boolean
}
