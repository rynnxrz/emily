-- ============================================================
-- White-Label Configuration
-- Emily Feature: White-label branding and theming
-- Created: 2026-02-01
-- ============================================================

-- ============================================================
-- 1. WHITE LABEL CONFIGURATIONS TABLE
-- ============================================================

CREATE TABLE white_label_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to tenant (one-to-one relationship)
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Brand Identity
    brand_name TEXT, -- Display name (defaults to tenant name)
    brand_tagline TEXT,
    logo_url TEXT,
    favicon_url TEXT,
    logo_dark_url TEXT, -- For dark mode
    
    -- Color Scheme (hex values)
    primary_color TEXT DEFAULT '#3B82F6',
    primary_foreground_color TEXT DEFAULT '#FFFFFF',
    secondary_color TEXT DEFAULT '#F3F4F6',
    secondary_foreground_color TEXT DEFAULT '#1F2937',
    accent_color TEXT DEFAULT '#10B981',
    accent_foreground_color TEXT DEFAULT '#FFFFFF',
    
    -- Background colors
    background_color TEXT DEFAULT '#FFFFFF',
    background_secondary_color TEXT DEFAULT '#F9FAFB',
    
    -- Text colors
    text_primary_color TEXT DEFAULT '#111827',
    text_secondary_color TEXT DEFAULT '#6B7280',
    text_muted_color TEXT DEFAULT '#9CA3AF',
    
    -- Border colors
    border_color TEXT DEFAULT '#E5E7EB',
    
    -- Typography (optional custom fonts)
    font_heading TEXT, -- e.g., 'Inter', 'Playfair Display'
    font_body TEXT DEFAULT 'sans-serif',
    font_base_size TEXT DEFAULT '16px',
    
    -- Custom CSS (for advanced customization)
    custom_css TEXT,
    
    -- Contact information override
    contact_email TEXT,
    contact_phone TEXT,
    contact_address TEXT,
    
    -- Social links (JSON)
    social_links JSONB DEFAULT '{}'::jsonb,
    
    -- Feature flags
    features JSONB DEFAULT '{}'::jsonb, -- {hide_branding: false, custom_domain: true, etc.}
    
    -- SEO
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure one config per tenant
CREATE UNIQUE INDEX idx_white_label_configs_tenant_id ON white_label_configs(tenant_id) WHERE is_active = true;

-- Index for lookups
CREATE INDEX idx_white_label_configs_active ON white_label_configs(tenant_id) WHERE is_active = true;

-- ============================================================
-- 2. CUSTOM DOMAINS (for white-label)
-- ============================================================

CREATE TABLE white_label_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to config
    config_id UUID NOT NULL REFERENCES white_label_configs(id) ON DELETE CASCADE,
    
    -- Domain details
    domain TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    ssl_status TEXT DEFAULT 'pending', -- 'pending', 'provisioning', 'active', 'failed'
    ssl_cert_expiry TIMESTAMPTZ,
    
    -- Verification
    verification_token TEXT,
    verified_at TIMESTAMPTZ,
    
    -- DNS records to configure (JSON)
    dns_records JSONB DEFAULT '{}'::jsonb,
    
    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'active', 'disabled', 'failed'
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE UNIQUE INDEX idx_white_label_domains_domain ON white_label_domains(domain);
CREATE INDEX idx_white_label_domains_config_id ON white_label_domains(config_id);

-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_white_label_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_white_label_configs_updated_at
    BEFORE UPDATE ON white_label_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_white_label_updated_at();

CREATE TRIGGER update_white_label_domains_updated_at
    BEFORE UPDATE ON white_label_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_white_label_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_domains ENABLE ROW LEVEL SECURITY;

-- White label configs: Only tenant members can view/edit
CREATE POLICY "Admins can view all white label configs" ON white_label_configs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Tenant members can view own config" ON white_label_configs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = white_label_configs.tenant_id
            AND tenant_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage own config" ON white_label_configs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = white_label_configs.tenant_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Admins can manage all configs" ON white_label_configs
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Domain policies
CREATE POLICY "Admins can view domains" ON white_label_domains
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Tenant members can view own domains" ON white_label_domains
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            JOIN white_label_configs ON white_label_configs.tenant_id = tenant_members.tenant_id
            WHERE white_label_configs.id = white_label_domains.config_id
            AND tenant_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant admins can manage domains" ON white_label_domains
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            JOIN white_label_configs ON white_label_configs.tenant_id = tenant_members.tenant_id
            WHERE white_label_configs.id = white_label_domains.config_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('admin', 'owner')
        )
    );

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Get active white label config by tenant ID
CREATE OR REPLACE FUNCTION get_white_label_config(p_tenant_id UUID)
RETURNS white_label_configs AS $$
    SELECT * FROM white_label_configs
    WHERE tenant_id = p_tenant_id AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Get white label config by domain
CREATE OR REPLACE FUNCTION get_white_label_config_by_domain(p_domain TEXT)
RETURNS white_label_configs AS $$
    SELECT wlc.* 
    FROM white_label_configs wlc
    JOIN white_label_domains wld ON wld.config_id = wlc.id
    WHERE wld.domain = p_domain 
    AND wld.status = 'active'
    AND wlc.is_active = true
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Generate CSS variables from config
CREATE OR REPLACE FUNCTION generate_css_variables(p_config_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_config white_label_configs;
    v_css TEXT;
BEGIN
    SELECT * INTO v_config FROM white_label_configs WHERE id = p_config_id;
    
    v_css := format('
:root {
    --brand-primary: %s;
    --brand-primary-foreground: %s;
    --brand-secondary: %s;
    --brand-secondary-foreground: %s;
    --brand-accent: %s;
    --brand-accent-foreground: %s;
    --brand-background: %s;
    --brand-background-secondary: %s;
    --brand-text-primary: %s;
    --brand-text-secondary: %s;
    --brand-text-muted: %s;
    --brand-border: %s;
    --brand-font-heading: %s;
    --brand-font-body: %s;
}',
        v_config.primary_color,
        v_config.primary_foreground_color,
        v_config.secondary_color,
        v_config.secondary_foreground_color,
        v_config.accent_color,
        v_config.accent_foreground_color,
        v_config.background_color,
        v_config.background_secondary_color,
        v_config.text_primary_color,
        v_config.text_secondary_color,
        v_config.text_muted_color,
        v_config.border_color,
        COALESCE(v_config.font_heading, 'inherit'),
        v_config.font_body
    );
    
    RETURN v_css;
END;
$$ LANGUAGE plpgsql;
