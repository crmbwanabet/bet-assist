-- ═══════════════════════════════════════════════════════════════════════════════
-- VoiceAgent Dashboard — Supabase Schema
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Users & Auth ──────────────────────────────────────────────────────────
-- Uses Supabase Auth for login. This table extends it with roles.

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'supervisor', 'agent')),
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
    ON public.profiles FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ── 2. Scripts ───────────────────────────────────────────────────────────────

CREATE TABLE public.scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    script_text TEXT NOT NULL,
    greeting_override TEXT,          -- Optional custom greeting (if null, LLM generates)
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view scripts"
    ON public.scripts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and supervisors can manage scripts"
    ON public.scripts FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
    );


-- ── 3. Caller IDs ────────────────────────────────────────────────────────────

CREATE TABLE public.caller_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL UNIQUE,
    label TEXT,                       -- e.g. "Main Line", "Campaign #2"
    gateway TEXT NOT NULL DEFAULT 'smsala',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.caller_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view caller_ids"
    ON public.caller_ids FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage caller_ids"
    ON public.caller_ids FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );


-- ── 4. Campaigns ─────────────────────────────────────────────────────────────

CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'cancelled')),
    script_id UUID NOT NULL REFERENCES public.scripts(id),
    caller_id_id UUID REFERENCES public.caller_ids(id),
    calls_per_minute INTEGER NOT NULL DEFAULT 2,
    max_concurrent INTEGER NOT NULL DEFAULT 2,
    total_contacts INTEGER NOT NULL DEFAULT 0,
    called_count INTEGER NOT NULL DEFAULT 0,
    answered_count INTEGER NOT NULL DEFAULT 0,
    interested_count INTEGER NOT NULL DEFAULT 0,
    not_interested_count INTEGER NOT NULL DEFAULT 0,
    no_answer_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES public.profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view campaigns"
    ON public.campaigns FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and supervisors can manage campaigns"
    ON public.campaigns FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
    );


-- ── 5. Campaign Contacts ─────────────────────────────────────────────────────

CREATE TABLE public.campaign_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    customer_name TEXT,
    client_id TEXT,                   -- External reference (e.g. BwanaBet player ID)
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'calling', 'completed', 'failed', 'skipped')),
    call_id UUID,                     -- Links to calls table after dialed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_contacts_campaign ON public.campaign_contacts(campaign_id);
CREATE INDEX idx_campaign_contacts_status ON public.campaign_contacts(campaign_id, status);

ALTER TABLE public.campaign_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view contacts"
    ON public.campaign_contacts FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins and supervisors can manage contacts"
    ON public.campaign_contacts FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'supervisor'))
    );


-- ── 6. Calls ─────────────────────────────────────────────────────────────────

CREATE TABLE public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_sid TEXT UNIQUE,             -- FreeSWITCH call UUID
    campaign_id UUID REFERENCES public.campaigns(id),
    phone_number TEXT NOT NULL,
    caller_id TEXT,
    customer_name TEXT,
    client_id TEXT,
    status TEXT NOT NULL DEFAULT 'initiating' CHECK (status IN ('initiating', 'ringing', 'talking', 'completed', 'failed', 'no_answer', 'busy')),
    outcome TEXT CHECK (outcome IN ('interested', 'not_interested', 'callback', 'wrong_number', 'voicemail', 'no_answer', 'busy', 'error', NULL)),
    duration INTEGER DEFAULT 0,       -- seconds
    turns INTEGER DEFAULT 0,
    script_id UUID REFERENCES public.scripts(id),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

CREATE INDEX idx_calls_campaign ON public.calls(campaign_id);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_calls_started ON public.calls(started_at DESC);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view calls"
    ON public.calls FOR SELECT USING (auth.role() = 'authenticated');


-- ── 7. Call Transcripts ──────────────────────────────────────────────────────

CREATE TABLE public.call_transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
    turn INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'agent', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transcripts_call ON public.call_transcripts(call_id, turn);

ALTER TABLE public.call_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view transcripts"
    ON public.call_transcripts FOR SELECT USING (auth.role() = 'authenticated');


-- ── 8. Settings ──────────────────────────────────────────────────────────────

CREATE TABLE public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view settings"
    ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage settings"
    ON public.settings FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Default settings
INSERT INTO public.settings (key, value) VALUES
    ('llm_provider', '"groq"'),
    ('llm_model', '"llama-3.3-70b-versatile"'),
    ('tts_voice_id', '"21m00Tcm4TlvDq8ikWAM"'),
    ('tts_model', '"eleven_turbo_v2_5"'),
    ('max_concurrent_calls', '2'),
    ('calls_per_minute', '2'),
    ('endpointing_ms', '300'),
    ('initial_delay_s', '3.5'),
    ('max_turns', '10');


-- ── 9. Updated_at trigger ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.scripts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.campaign_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
