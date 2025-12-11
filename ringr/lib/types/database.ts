// Database Types for Ringr

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'locked';

export type UserRole = 'owner' | 'admin' | 'member';

export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'in_progress' | 'completed' | 'failed' | 'missed';
export type CallOutcome = 'appointment_booked' | 'callback_requested' | 'information_provided' | 'not_qualified' | 'voicemail' | 'transferred' | 'other';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_cents: number;
  minutes_included: number;
  max_phone_numbers: number;
  max_agents: number | null;
  features: {
    calendar_integration: boolean;
    analytics: 'basic' | 'full';
    support: 'email' | 'priority' | 'dedicated';
    api_access: boolean;
  };
  stripe_price_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  industry: string | null;
  timezone: string;
  business_hours: Record<string, { start: string; end: string }>;
  
  plan_id: string | null;
  subscription_status: SubscriptionStatus;
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  
  current_period_start: string | null;
  current_period_end: string | null;
  minutes_used: number;
  
  onboarding_completed: boolean;
  onboarding_step: number;
  
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  organization_id: string | null;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_super_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  phone_number: string | null;
  is_active: boolean;
  
  voice_provider: string;
  voice_provider_agent_id: string | null;
  voice_provider_config: Record<string, unknown>;
  
  greeting_message: string;
  system_prompt: string | null;
  services: string[];
  qualification_questions: string[];
  
  calendar_integration: Record<string, unknown>;
  
  created_at: string;
  updated_at: string;
}

export interface Call {
  id: string;
  organization_id: string;
  agent_id: string | null;
  
  external_call_id: string | null;
  
  direction: CallDirection;
  status: CallStatus;
  caller_phone: string | null;
  caller_name: string | null;
  
  started_at: string;
  ended_at: string | null;
  duration_seconds: number;
  
  recording_url: string | null;
  
  summary: string | null;
  sentiment: Sentiment | null;
  outcome: CallOutcome | null;
  
  metadata: Record<string, unknown>;
  
  created_at: string;
}

export interface TranscriptMessage {
  role: 'ai' | 'user' | 'system';
  content: string;
  timestamp?: string;
}

export interface Transcript {
  id: string;
  call_id: string;
  messages: TranscriptMessage[];
  created_at: string;
}

export interface Appointment {
  id: string;
  organization_id: string;
  call_id: string | null;
  
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_address: string | null;
  
  service_type: string | null;
  notes: string | null;
  
  scheduled_at: string;
  duration_minutes: number;
  
  status: AppointmentStatus;
  
  external_calendar_id: string | null;
  external_event_id: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface UsageLog {
  id: string;
  organization_id: string;
  call_id: string | null;
  minutes_used: number;
  period_start: string;
  period_end: string;
  created_at: string;
}

export interface CallAnalytics {
  id: string;
  organization_id: string;
  date: string;
  total_calls: number;
  answered_calls: number;
  missed_calls: number;
  appointments_booked: number;
  total_duration_seconds: number;
  avg_duration_seconds: number;
  created_at: string;
}

export interface AccountStatus {
  subscription_status: SubscriptionStatus;
  plan_name: string;
  minutes_used: number;
  minutes_included: number;
  minutes_remaining: number;
  is_trial: boolean;
  trial_ends_at: string | null;
  trial_days_remaining: number;
  can_make_calls: boolean;
  is_locked: boolean;
  lock_reason: 'subscription_canceled' | 'account_locked' | 'trial_expired' | 'minutes_exhausted' | null;
  period_end: string | null;
}

// Extended types with relations
export interface OrganizationWithPlan extends Organization {
  plan: Plan | null;
}

export interface CallWithTranscript extends Call {
  transcript: Transcript | null;
}

export interface UserWithOrganization extends User {
  organization: OrganizationWithPlan | null;
}
