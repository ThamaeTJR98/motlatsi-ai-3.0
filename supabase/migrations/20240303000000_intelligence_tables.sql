-- Add Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day TEXT NOT NULL, -- Mon, Tue, Wed, Thu, Fri, Sat, Sun
    time TEXT NOT NULL, -- HH:mm
    subject TEXT NOT NULL,
    type TEXT NOT NULL, -- 'class', 'study', 'remedial'
    notes TEXT,
    linked_topic_id TEXT,
    is_auto_generated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Organization Settings Table
CREATE TABLE IF NOT EXISTS organization_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    curriculum_type TEXT DEFAULT 'Lesotho National',
    term_dates JSONB, -- { "term1": { "start": "...", "end": "..." } }
    ai_config JSONB DEFAULT '{"max_tokens_per_user": 50000}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Schedules
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own schedule"
    ON schedules FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own schedule"
    ON schedules FOR ALL
    USING (auth.uid() = user_id);

-- RLS for Organization Settings
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization members can view settings"
    ON organization_settings FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.organization_id = organization_settings.organization_id
        )
    );

-- RPC to increment quota
CREATE OR REPLACE FUNCTION increment_org_quota(org_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE organizations
    SET used_quota = used_quota + 1
    WHERE id = org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
