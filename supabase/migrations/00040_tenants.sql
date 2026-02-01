-- ============================================================
-- Multi-Tenant Support
-- Emily Feature: Multi-tenant architecture for B2B clients
-- Created: 2026-02-01
-- ============================================================

-- ============================================================
-- 1. TENANTS TABLE
-- ============================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant identification
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    
    -- Subscription/plan info
    plan TEXT NOT NULL DEFAULT 'basic',
    status TEXT NOT NULL DEFAULT 'active',
    
    -- Branding (for white-label)
    logo_url TEXT,
    primary_color TEXT DEFAULT '#000000',
    secondary_color TEXT DEFAULT '#ffffff',
    
    -- Contact info
    contact_email TEXT,
    contact_phone TEXT,
    
    -- Business details
    business_type TEXT,
    tax_id TEXT,
    
    -- Settings JSON for flexibility
    settings JSONB DEFAULT '{}'::jsonb,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for slug lookups (common in multi-tenant)
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================================
-- 2. TENANT MEMBERSHIP (Users belong to tenants)
-- ============================================================

CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant reference
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- User reference
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Role within tenant
    role TEXT NOT NULL DEFAULT 'member',
    
    -- Permissions JSON for granular access
    permissions JSONB DEFAULT '{}'::jsonb,
    
    -- Join date
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: user can only have one membership per tenant
    UNIQUE(tenant_id, user_id)
);

-- Index for quick lookups
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);

-- ============================================================
-- 3. FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenants_updated_at();

-- ============================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- Tenants: Only admins or tenant members can view
CREATE POLICY "Admins can view all tenants" ON tenants
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage tenants" ON tenants
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Tenant members can view their tenant
CREATE POLICY "Members can view own tenant" ON tenants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members 
            WHERE tenant_members.tenant_id = tenants.id 
            AND tenant_members.user_id = auth.uid()
        )
    );

-- Tenant members policies
CREATE POLICY "Members can view tenant memberships" ON tenant_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members AS tm
            WHERE tm.tenant_id = tenant_members.tenant_id
            AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage tenant memberships" ON tenant_members
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 5. HELPER FUNCTIONS
-- ============================================================

-- Get current user's tenant context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
    SELECT tenant_members.tenant_id
    FROM tenant_members
    WHERE tenant_members.user_id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Check if user is member of a specific tenant
CREATE OR REPLACE FUNCTION is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM tenant_members
        WHERE tenant_id = p_tenant_id
        AND user_id = auth.uid()
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- Get tenant by slug
CREATE OR REPLACE FUNCTION get_tenant_by_slug(p_slug TEXT)
RETURNS TABLE (id UUID, name TEXT, logo_url TEXT, primary_color TEXT, settings JSONB) AS $$
    SELECT t.id, t.name, t.logo_url, t.primary_color, t.settings
    FROM tenants t
    WHERE t.slug = p_slug AND t.status = 'active';
$$ LANGUAGE sql SECURITY DEFINER;
