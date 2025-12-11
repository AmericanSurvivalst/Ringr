-- Ringr Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PLANS TABLE (pricing tiers)
-- ============================================
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- 'starter', 'growth', 'scale'
    display_name TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    minutes_included INTEGER NOT NULL,
    max_phone_numbers INTEGER NOT NULL DEFAULT 1,
    max_agents INTEGER, -- NULL = unlimited
    features JSONB DEFAULT '{}',
    stripe_price_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plans
INSERT INTO public.plans (name, display_name, price_cents, minutes_included, max_phone_numbers, max_agents, features) VALUES
('starter', 'Starter', 29700, 500, 1, 1, '{"calendar_integration": false, "analytics": "basic", "support": "email", "api_access": false}'),
('growth', 'Growth', 59700, 1500, 3, 3, '{"calendar_integration": true, "analytics": "full", "support": "priority", "api_access": false}'),
('scale', 'Scale', 149700, 5000, 10, null, '{"calendar_integration": true, "analytics": "full", "support": "dedicated", "api_access": true}');

-- ============================================
-- ORGANIZATIONS TABLE
-- ============================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    phone TEXT,
    industry TEXT,
    timezone TEXT DEFAULT 'America/New_York',
    business_hours JSONB DEFAULT '{"mon": {"start": "08:00", "end": "18:00"}, "tue": {"start": "08:00", "end": "18:00"}, "wed": {"start": "08:00", "end": "18:00"}, "thu": {"start": "08:00", "end": "18:00"}, "fri": {"start": "08:00", "end": "18:00"}}',
    
    -- Subscription fields
    plan_id UUID REFERENCES public.plans(id),
    subscription_status TEXT DEFAULT 'trialing', -- 'trialing', 'active', 'past_due', 'canceled', 'locked'
    trial_ends_at TIMESTAMPTZ,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT UNIQUE,
    
    -- Usage tracking
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    minutes_used INTEGER DEFAULT 0,
    
    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_step INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
    is_super_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AGENTS TABLE
-- ============================================
CREATE TABLE public.agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Main Agent',
    phone_number TEXT,
    is_active BOOLEAN DEFAULT true,
    
    -- Voice provider config
    voice_provider TEXT DEFAULT 'vapi', -- 'vapi', 'retell', 'bland', etc.
    voice_provider_agent_id TEXT,
    voice_provider_config JSONB DEFAULT '{}',
    
    -- Conversation settings
    greeting_message TEXT DEFAULT 'Thanks for calling! How can I help you today?',
    system_prompt TEXT,
    services JSONB DEFAULT '[]', -- Array of service offerings
    qualification_questions JSONB DEFAULT '[]',
    
    -- Integration
    calendar_integration JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALLS TABLE
-- ============================================
CREATE TABLE public.calls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    
    -- Call identifiers
    external_call_id TEXT, -- ID from voice provider
    
    -- Call details
    direction TEXT DEFAULT 'inbound', -- 'inbound', 'outbound'
    status TEXT DEFAULT 'completed', -- 'in_progress', 'completed', 'failed', 'missed'
    caller_phone TEXT,
    caller_name TEXT,
    
    -- Duration & timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0,
    
    -- Recordings & transcripts
    recording_url TEXT,
    
    -- AI analysis
    summary TEXT,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    outcome TEXT, -- 'appointment_booked', 'callback_requested', 'information_provided', 'not_qualified', 'voicemail', 'transferred'
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSCRIPTS TABLE
-- ============================================
CREATE TABLE public.transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- APPOINTMENTS TABLE
-- ============================================
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    customer_address TEXT,
    
    service_type TEXT,
    notes TEXT,
    
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
    
    -- External calendar
    external_calendar_id TEXT,
    external_event_id TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USAGE LOGS TABLE (for detailed tracking)
-- ============================================
CREATE TABLE public.usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
    minutes_used DECIMAL(10, 2) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CALL ANALYTICS TABLE (daily aggregates)
-- ============================================
CREATE TABLE public.call_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_calls INTEGER DEFAULT 0,
    answered_calls INTEGER DEFAULT 0,
    missed_calls INTEGER DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    total_duration_seconds INTEGER DEFAULT 0,
    avg_duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id, date)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_analytics ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see their own org
CREATE POLICY "Users can view own organization" ON public.organizations
    FOR SELECT USING (
        id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_super_admin = true)
    );

CREATE POLICY "Users can update own organization" ON public.organizations
    FOR UPDATE USING (
        id IN (SELECT organization_id FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Users: Can see users in same org
CREATE POLICY "Users can view org members" ON public.users
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        OR id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_super_admin = true)
    );

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (id = auth.uid());

-- Agents: Org members can view/edit
CREATE POLICY "Org members can view agents" ON public.agents
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Org admins can manage agents" ON public.agents
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    );

-- Calls: Org members can view
CREATE POLICY "Org members can view calls" ON public.calls
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- Transcripts: Org members can view
CREATE POLICY "Org members can view transcripts" ON public.transcripts
    FOR SELECT USING (
        call_id IN (
            SELECT id FROM public.calls 
            WHERE organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
        )
    );

-- Appointments: Org members can view/manage
CREATE POLICY "Org members can view appointments" ON public.appointments
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Org members can manage appointments" ON public.appointments
    FOR ALL USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- Usage logs: Org members can view
CREATE POLICY "Org members can view usage" ON public.usage_logs
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- Analytics: Org members can view
CREATE POLICY "Org members can view analytics" ON public.call_analytics
    FOR SELECT USING (
        organization_id IN (SELECT organization_id FROM public.users WHERE id = auth.uid())
    );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to check if org can make calls (within limits and not locked)
CREATE OR REPLACE FUNCTION public.can_make_calls(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    org RECORD;
    plan RECORD;
BEGIN
    SELECT * INTO org FROM public.organizations WHERE id = org_id;
    
    IF org IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check subscription status
    IF org.subscription_status = 'locked' THEN
        RETURN false;
    END IF;
    
    IF org.subscription_status = 'canceled' THEN
        RETURN false;
    END IF;
    
    -- Check trial expiration
    IF org.subscription_status = 'trialing' AND org.trial_ends_at < NOW() THEN
        RETURN false;
    END IF;
    
    -- Check minute limits
    SELECT * INTO plan FROM public.plans WHERE id = org.plan_id;
    
    IF plan IS NOT NULL AND org.minutes_used >= plan.minutes_included THEN
        RETURN false;
    END IF;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(org_id UUID, minutes DECIMAL)
RETURNS VOID AS $$
BEGIN
    UPDATE public.organizations 
    SET minutes_used = minutes_used + minutes,
        updated_at = NOW()
    WHERE id = org_id;
    
    -- Log usage
    INSERT INTO public.usage_logs (organization_id, minutes_used, period_start, period_end)
    SELECT org_id, minutes, current_period_start, current_period_end
    FROM public.organizations WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset usage at period start
CREATE OR REPLACE FUNCTION public.reset_usage(org_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.organizations 
    SET minutes_used = 0,
        current_period_start = NOW(),
        current_period_end = NOW() + INTERVAL '1 month',
        updated_at = NOW()
    WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get account status
CREATE OR REPLACE FUNCTION public.get_account_status(org_id UUID)
RETURNS JSONB AS $$
DECLARE
    org RECORD;
    plan RECORD;
    result JSONB;
BEGIN
    SELECT * INTO org FROM public.organizations WHERE id = org_id;
    SELECT * INTO plan FROM public.plans WHERE id = org.plan_id;
    
    result := jsonb_build_object(
        'subscription_status', org.subscription_status,
        'plan_name', COALESCE(plan.name, 'none'),
        'minutes_used', org.minutes_used,
        'minutes_included', COALESCE(plan.minutes_included, 0),
        'minutes_remaining', GREATEST(0, COALESCE(plan.minutes_included, 0) - org.minutes_used),
        'is_trial', org.subscription_status = 'trialing',
        'trial_ends_at', org.trial_ends_at,
        'trial_days_remaining', CASE 
            WHEN org.subscription_status = 'trialing' AND org.trial_ends_at > NOW()
            THEN EXTRACT(DAY FROM org.trial_ends_at - NOW())::INTEGER
            ELSE 0
        END,
        'can_make_calls', public.can_make_calls(org_id),
        'is_locked', org.subscription_status IN ('locked', 'canceled') OR 
                     (org.subscription_status = 'trialing' AND org.trial_ends_at < NOW()) OR
                     (plan IS NOT NULL AND org.minutes_used >= plan.minutes_included),
        'lock_reason', CASE
            WHEN org.subscription_status = 'canceled' THEN 'subscription_canceled'
            WHEN org.subscription_status = 'locked' THEN 'account_locked'
            WHEN org.subscription_status = 'trialing' AND org.trial_ends_at < NOW() THEN 'trial_expired'
            WHEN plan IS NOT NULL AND org.minutes_used >= plan.minutes_included THEN 'minutes_exhausted'
            ELSE NULL
        END,
        'period_end', org.current_period_end
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name)
    VALUES (
        NEW.id, 
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_users_organization ON public.users(organization_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_agents_organization ON public.agents(organization_id);
CREATE INDEX idx_calls_organization ON public.calls(organization_id);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX idx_calls_external_id ON public.calls(external_call_id);
CREATE INDEX idx_transcripts_call ON public.transcripts(call_id);
CREATE INDEX idx_appointments_organization ON public.appointments(organization_id);
CREATE INDEX idx_appointments_scheduled ON public.appointments(scheduled_at);
CREATE INDEX idx_usage_logs_organization ON public.usage_logs(organization_id);
CREATE INDEX idx_call_analytics_org_date ON public.call_analytics(organization_id, date DESC);
CREATE INDEX idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
CREATE INDEX idx_organizations_stripe_subscription ON public.organizations(stripe_subscription_id);
