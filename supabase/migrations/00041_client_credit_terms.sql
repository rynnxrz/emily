-- ============================================================
-- Client Credit Terms
-- Emily Feature: B2B credit terms and payment scheduling
-- Created: 2026-02-01
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

-- Credit term types
CREATE TYPE credit_term_type AS ENUM (
    'NET_15',
    'NET_30',
    'NET_45',
    'NET_60',
    'NET_90',
    'COD',
    'PREPAID',
    'CUSTOM'
);

-- Credit status
CREATE TYPE credit_status AS ENUM (
    'ACTIVE',
    'SUSPENDED',
    'EXPIRED',
    'PENDING_APPROVAL'
);

-- ============================================================
-- 2. CREDIT TERMS TABLE
-- ============================================================

CREATE TABLE credit_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Client reference (profiles or organization)
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Credit configuration
    credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
    available_credit GENERATED ALWAYS AS (credit_limit - current_balance) STORED,
    
    -- Payment terms
    term_type credit_term_type NOT NULL DEFAULT 'NET_30',
    custom_days INTEGER, -- For CUSTOM term type
    discount_percent DECIMAL(5, 2) DEFAULT 0, -- Early payment discount
    discount_days INTEGER DEFAULT 0, -- Days for early payment discount
    
    -- Status and dates
    status credit_status NOT NULL DEFAULT 'PENDING_APPROVAL',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    
    -- Notes
    notes TEXT,
    
    -- Audit fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_terms_client_id ON credit_terms(client_id);
CREATE INDEX idx_credit_terms_tenant_id ON credit_terms(tenant_id);
CREATE INDEX idx_credit_terms_status ON credit_terms(status);

-- ============================================================
-- 3. CREDIT TRANSACTIONS (Payment history)
-- ============================================================

CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to credit terms
    credit_term_id UUID NOT NULL REFERENCES credit_terms(id) ON DELETE CASCADE,
    
    -- Transaction details
    transaction_type TEXT NOT NULL, -- 'PAYMENT', 'PURCHASE', 'ADJUSTMENT', 'REFUND'
    amount DECIMAL(12, 2) NOT NULL,
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    
    -- Reference (invoice/payment ID)
    reference_type TEXT, -- 'invoice', 'payment', 'manual'
    reference_id UUID,
    
    -- Description
    description TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index
CREATE INDEX idx_credit_transactions_credit_term_id ON credit_transactions(credit_term_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);

-- ============================================================
-- 4. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_credit_terms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_credit_terms_updated_at
    BEFORE UPDATE ON credit_terms
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_terms_updated_at();

-- Function to update balance after transaction
CREATE OR REPLACE FUNCTION update_credit_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transaction_type IN ('PAYMENT', 'REFUND') THEN
        NEW.balance_after := NEW.balance_before - NEW.amount;
    ELSE
        NEW.balance_after := NEW.balance_before + NEW.amount;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_credit_transaction_balance
    BEFORE INSERT ON credit_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_credit_balance();

-- ============================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE credit_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Credit terms policies
CREATE POLICY "Admins can view all credit terms" ON credit_terms
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Clients can view own credit terms" ON credit_terms
    FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "Admins can manage credit terms" ON credit_terms
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Tenant admins can manage tenant credit terms" ON credit_terms
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tenant_members
            WHERE tenant_members.tenant_id = credit_terms.tenant_id
            AND tenant_members.user_id = auth.uid()
            AND tenant_members.role IN ('admin', 'owner')
        )
    );

-- Credit transactions policies
CREATE POLICY "Admins can view all transactions" ON credit_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Clients can view own transactions" ON credit_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM credit_terms
            WHERE credit_terms.id = credit_transactions.credit_term_id
            AND credit_terms.client_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage transactions" ON credit_transactions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 6. HELPER FUNCTIONS
-- ============================================================

-- Calculate due date based on term type
CREATE OR REPLACE FUNCTION calculate_due_date(
    p_term_type credit_term_type,
    p_custom_days INTEGER DEFAULT NULL
) RETURNS DATE AS $$
DECLARE
    v_days INTEGER;
BEGIN
    CASE p_term_type
        WHEN 'NET_15' THEN v_days := 15;
        WHEN 'NET_30' THEN v_days := 30;
        WHEN 'NET_45' THEN v_days := 45;
        WHEN 'NET_60' THEN v_days := 60;
        WHEN 'NET_90' THEN v_days := 90;
        WHEN 'COD' THEN v_days := 0;
        WHEN 'PREPAID' THEN v_days := 0;
        WHEN 'CUSTOM' THEN v_days := COALESCE(p_custom_days, 30);
    END CASE;
    
    RETURN CURRENT_DATE + v_days;
END;
$$ LANGUAGE plpgsql;

-- Get client's credit summary
CREATE OR REPLACE FUNCTION get_client_credit_summary(p_client_id UUID)
RETURNS TABLE (
    credit_limit DECIMAL,
    current_balance DECIMAL,
    available_credit DECIMAL,
    status credit_status,
    term_type credit_term_type
) AS $$
    SELECT ct.credit_limit, ct.current_balance, ct.available_credit, ct.status, ct.term_type
    FROM credit_terms ct
    WHERE ct.client_id = p_client_id AND ct.status = 'ACTIVE'
    ORDER BY ct.created_at DESC
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;
