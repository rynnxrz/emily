import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from 'next/server'
import type { Tenant, TenantStatus } from '@/types'

// Helper to get current user
async function getCurrentUser() {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
        return { user: null, error: 'Unauthorized' }
    }
    return { user, error: null }
}

// GET /api/tenants - List all tenants for current user
export async function GET(request: Request) {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
        return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as TenantStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    try {
        let query = supabase
            .from('tenants')
            .select('*')
            .eq('owner_id', user.id)

        if (status) {
            query = query.eq('status', status)
        }

        const { data: tenants, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1)
            .limit(limit)
            .count()

        if (error) {
            console.error('Error fetching tenants:', error)
            return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
        }

        return NextResponse.json({
            tenants: tenants || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })
    } catch (err) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/tenants - Create new tenant
export async function POST(request: Request) {
    const { user, error: authError } = await getCurrentUser()
    if (authError || !user) {
        return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, slug, settings, white_label_config } = body

        // Validate required fields
        if (!name || !slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            )
        }

        // Validate slug format (alphanumeric, hyphens, underscores)
        if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
            return NextResponse.json(
                { error: 'Slug must contain only alphanumeric characters, hyphens, and underscores' },
                { status: 400 }
            )
        }

        // Check if slug is already taken
        const { data: existingTenant } = await supabase
            .from('tenants')
            .select('id')
            .eq('slug', slug)
            .single()

        if (existingTenant) {
            return NextResponse.json(
                { error: 'This slug is already taken' },
                { status: 409 }
            )
        }

        // Check tenant limits for user
        const { count: tenantCount } = await supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id)

        const MAX_TENANTS = 5 // Configurable limit
        if (tenantCount && tenantCount >= MAX_TENANTS) {
            return NextResponse.json(
                { error: `Maximum tenant limit (${MAX_TENANTS}) reached` },
                { status: 403 }
            )
        }

        // Default settings
        const defaultSettings = {
            max_users: 5,
            max_storage_gb: 10,
            features: ['basic'],
            plan: 'starter' as const
        }

        const { data: newTenant, error: insertError } = await supabase
            .from('tenants')
            .insert({
                name,
                slug,
                owner_id: user.id,
                status: 'trial',
                settings: { ...defaultSettings, ...settings },
                white_label_config: white_label_config || null
            })
            .select()
            .single()

        if (insertError) {
            console.error('Error creating tenant:', insertError)
            return NextResponse.json(
                { error: 'Failed to create tenant' },
                { status: 500 }
            )
        }

        // Create owner membership
        await supabase
            .from('tenant_members')
            .insert({
                tenant_id: newTenant.id,
                user_id: user.id,
                role: 'owner',
                status: 'active',
                email: user.email,
                name: user.user_metadata?.full_name || user.email
            })

        return NextResponse.json({ tenant: newTenant }, { status: 201 })
    } catch (err) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
