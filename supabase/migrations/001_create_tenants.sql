-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    owner_id UUID REFERENCES auth.users(id) NOT NULL,
    status VARCHAR(20) DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'trial', 'cancelled')),
    settings JSONB DEFAULT '{
        "max_users": 5,
        "max_storage_gb": 10,
        "features": ["basic"],
        "plan": "starter"
    }',
    white_label_config JSONB DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tenant_members table
CREATE TABLE IF NOT EXISTS tenant_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
    invite_token VARCHAR(255),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id),
    UNIQUE(tenant_id, email)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members(user_id);

-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for tenants
CREATE POLICY "Users can view their own tenants" ON tenants
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create tenants" ON tenants
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Tenant owners/admins can update tenants" ON tenants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_id = tenants.id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- RLS policies for tenant_members
CREATE POLICY "Tenant members can view other members" ON tenant_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_id = tenant_members.tenant_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Tenant owners/admins can invite members" ON tenant_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.tenant_id = tenant_members.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Tenant owners/admins can manage members" ON tenant_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM tenant_members tm
            WHERE tm.tenant_id = tenant_members.tenant_id
            AND tm.user_id = auth.uid()
            AND tm.role IN ('owner', 'admin')
        )
    );
