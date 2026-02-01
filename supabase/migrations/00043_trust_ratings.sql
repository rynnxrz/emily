-- ============================================================
-- Trust/Rating System
-- Emily Feature: Trust ratings for B2B clients and partners
-- Created: 2026-02-01
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================

-- Rating types
CREATE TYPE rating_type AS ENUM (
    'CLIENT_TRUST',      -- Client trust score
    'SUPPLIER_RELIABILITY', -- Supplier reliability
    'PARTNER_RATING',    -- Partner rating
    'INTERNAL_SCORE'     -- Internal scoring
);

-- Review status
CREATE TYPE review_status AS ENUM (
    'PENDING',
    'APPROVED',
    'DISPUTED',
    'FLAGGED'
);

-- ============================================================
-- 2. TRUST RATINGS TABLE (Overall scores)
-- ============================================================

CREATE TABLE trust_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Entity being rated (could be profile or organization)
    entity_id UUID NOT NULL, -- References profiles.id or organizations table
    entity_type TEXT NOT NULL, -- 'profile', 'organization', 'tenant'
    
    -- Tenant context (for multi-tenant)
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    
    -- Rating breakdown
    overall_score DECIMAL(3, 2) NOT NULL DEFAULT 0, -- 0.00 to 5.00
    reliability_score DECIMAL(3, 2) DEFAULT 0, -- Payment reliability
    communication_score DECIMAL(3, 2) DEFAULT 0, -- Communication quality
    quality_score DECIMAL(3, 2) DEFAULT 0, -- Product/service quality
    delivery_score DECIMAL(3, 2) DEFAULT 0; -- On-time delivery
    
    -- Rating counts
    total_reviews INTEGER NOT NULL DEFAULT 0,
    five_star_count INTEGER DEFAULT 0,
    four_star_count INTEGER DEFAULT 0,
    three_star_count INTEGER DEFAULT 0,
    two_star_count INTEGER DEFAULT 0,
    one_star_count INTEGER DEFAULT 0,
    
    -- Calculated metrics
    weighted_score DECIMAL(3, 2) DEFAULT 0, -- Time-weighted average
    trend_score DECIMAL(3, 2) DEFAULT 0, -- Recent trend (+/-)
    
    -- Badges/tiers
    trust_level TEXT, -- 'bronze', 'silver', 'gold', 'platinum'
    badges JSONB DEFAULT '[]'::jsonb, -- Array of badge IDs
    
    -- Risk assessment
    risk_level TEXT, -- 'low', 'medium', 'high'
    risk_factors JSONB DEFAULT '[]'::jsonb,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    last_review_at TIMESTAMPTZ,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint for entity
CREATE UNIQUE INDEX idx_trust_ratings_entity ON trust_ratings(entity_id, entity_type, COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID));

-- Indexes
CREATE INDEX idx_trust_ratings_entity_id ON trust_ratings(entity_id);
CREATE INDEX idx_trust_ratings_tenant_id ON trust_ratings(tenant_id);
CREATE INDEX idx_trust_ratings_overall_score ON trust_ratings(overall_score DESC);
CREATE INDEX idx_trust_ratings_trust_level ON trust_ratings(trust_level);

-- ============================================================
-- 3. REVIEWS TABLE (Individual reviews)
-- ============================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Rating reference
    trust_rating_id UUID NOT NULL REFERENCES trust_ratings(id) ON DELETE CASCADE,
    
    -- Reviewer (who wrote the review)
    reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Entity being reviewed
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    
    -- Rating details
    rating_type rating_type NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    
    -- Detailed scores (optional)
    reliability_score DECIMAL(3, 2),
    communication_score DECIMAL(3, 2),
    quality_score DECIMAL(3, 2),
    delivery_score DECIMAL(3, 2),
    
    -- Review content
    title TEXT,
    content TEXT NOT NULL,
    pros TEXT, -- Positive points
    cons TEXT, -- Negative points
    
    -- Context (what was this review about?)
    context_type TEXT, -- 'invoice', 'order', 'project', etc.
    context_id UUID, -- Reference to the context
    
    -- Status
    status review_status NOT NULL DEFAULT 'PENDING',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE, -- Verified purchase/transaction
    is_public BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Response from entity
    response_content TEXT,
    responded_at TIMESTAMPTZ,
    
    -- Helpfulness votes
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_reviews_trust_rating_id ON reviews(trust_rating_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);
CREATE INDEX idx_reviews_entity_id ON reviews(entity_id, entity_type);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

-- ============================================================
-- 4. REVIEW VOTES (Helpfulness)
-- ============================================================

CREATE TABLE review_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Review reference
    review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    
    -- Voter
    voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Vote type
    vote_type INTEGER NOT NULL CHECK (vote_type IN (1, -1)), -- 1 = helpful, -1 = unhelpful
    
    -- Unique constraint
    UNIQUE(review_id, voter_id),
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. TRUST BADGES TABLE
-- ============================================================

CREATE TABLE trust_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Badge details
    name TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    -- Criteria (JSON)
    criteria JSONB NOT NULL, -- {min_reviews: 10, min_score: 4.0, etc.}
    
    -- Tier/level
    tier TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at for ratings
CREATE OR REPLACE FUNCTION update_trust_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trust_ratings_updated_at
    BEFORE UPDATE ON trust_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_trust_ratings_updated_at();

-- Auto-update updated_at for reviews
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_reviews_updated_at();

-- Function to recalculate trust rating
CREATE OR REPLACE FUNCTION recalculate_trust_rating(p_trust_rating_id UUID)
RETURNS void AS $$
DECLARE
    v_rating trust_ratings;
    v_avg_score DECIMAL(3, 2);
    v_total_reviews INTEGER;
BEGIN
    SELECT * INTO v_rating FROM trust_ratings WHERE id = p_trust_rating_id;
    
    -- Calculate average from approved reviews
    SELECT 
        COALESCE(AVG(r.rating), 0),
        COUNT(*)
    INTO v_avg_score, v_total_reviews
    FROM reviews r
    WHERE r.trust_rating_id = p_trust_rating_id
    AND r.status = 'APPROVED'
    AND r.is_public = true;
    
    -- Update the rating
    UPDATE trust_ratings SET
        overall_score = ROUND(v_avg_score::numeric, 2),
        total_reviews = v_total_reviews,
        calculated_at = NOW(),
        last_review_at = NOW()
    WHERE id = p_trust_rating_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 7. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE trust_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_badges ENABLE ROW LEVEL SECURITY;

-- Trust ratings: Public read, entity can view details
CREATE POLICY "Public can view active ratings" ON trust_ratings
    FOR SELECT USING (is_active = true);

CREATE POLICY "Entity can view own rating" ON trust_ratings
    FOR SELECT USING (
        entity_id = auth.uid() OR
        EXISTS (SELECT 1 FROM tenant_members WHERE tenant_id = entity_id AND user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all ratings" ON trust_ratings
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Reviews: Public can view approved public reviews
CREATE POLICY "Public can view approved reviews" ON reviews
    FOR SELECT USING (status = 'APPROVED' AND is_public = true);

CREATE POLICY "Reviewer can view own reviews" ON reviews
    FOR SELECT USING (reviewer_id = auth.uid());

CREATE POLICY "Entity can view reviews about them" ON reviews
    FOR SELECT USING (entity_id = auth.uid());

CREATE POLICY "Authenticated users can create reviews" ON reviews
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Reviewer can update own reviews" ON reviews
    FOR UPDATE USING (reviewer_id = auth.uid() AND status = 'PENDING');

CREATE POLICY "Admins can manage all reviews" ON reviews
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Review votes
CREATE POLICY "Authenticated users can vote" ON review_votes
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view votes" ON review_votes
    FOR SELECT USING (true);

-- Trust badges: Public read
CREATE POLICY "Public can view badges" ON trust_badges
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badges" ON trust_badges
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================
-- 8. HELPER FUNCTIONS
-- ============================================================

-- Get or create trust rating for entity
CREATE OR REPLACE FUNCTION get_or_create_trust_rating(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_tenant_id UUID DEFAULT NULL
) RETURNS trust_ratings AS $$
DECLARE
    v_rating trust_ratings;
BEGIN
    SELECT * INTO v_rating
    FROM trust_ratings
    WHERE entity_id = p_entity_id
    AND entity_type = p_entity_type
    AND COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::UUID) = COALESCE(p_tenant_id, '00000000-0000-0000-0000-000000000000'::UUID)
    LIMIT 1;
    
    IF NOT FOUND THEN
        INSERT INTO trust_ratings (entity_id, entity_type, tenant_id)
        VALUES (p_entity_id, p_entity_type, p_tenant_id)
        RETURNING * INTO v_rating;
    END IF;
    
    RETURN v_rating;
END;
$$ LANGUAGE plpgsql;

-- Calculate trust level based on score
CREATE OR REPLACE FUNCTION calculate_trust_level(p_score DECIMAL(3, 2))
RETURNS TEXT AS $$
BEGIN
    CASE
        WHEN p_score >= 4.5 THEN RETURN 'platinum';
        WHEN p_score >= 4.0 THEN RETURN 'gold';
        WHEN p_score >= 3.5 THEN RETURN 'silver';
        WHEN p_score >= 3.0 THEN RETURN 'bronze';
        ELSE RETURN 'none';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Get reviews for an entity
CREATE OR REPLACE FUNCTION get_entity_reviews(
    p_entity_id UUID,
    p_entity_type TEXT,
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0
) RETURNS TABLE (
    id UUID,
    rating INTEGER,
    title TEXT,
    content TEXT,
    reviewer_name TEXT,
    created_at TIMESTAMPTZ
) AS $$
    SELECT 
        r.id,
        r.rating,
        r.title,
        r.content,
        p.full_name as reviewer_name,
        r.created_at
    FROM reviews r
    LEFT JOIN profiles p ON p.id = r.reviewer_id
    WHERE r.entity_id = p_entity_id
    AND r.entity_type = p_entity_type
    AND r.status = 'APPROVED'
    AND r.is_public = true
    ORDER BY r.created_at DESC
    LIMIT p_limit OFFSET p_offset;
$$ LANGUAGE sql SECURITY DEFINER;
