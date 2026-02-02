import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from 'next/server'
import type { TenantUpdate, WhiteLabelConfig } from '@/types'

// Helper to get current user and check tenant access
async function getUserWithTenantAccess(supabase: any, tenantId: string, requiredRole?: string[]) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { access: null, error: 'Unauthorized' }
    }

    // Check if user is a member of this tenant
    const { data: membership, error: memberError } = await supabase
        .from('tenant_members')
        .select('role, status')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .single()

    if (memberError || !membership) {
        return { access: null, error: 'Access denied to this tenant' }
    }

    if (membership.status !== 'active') {
        return { access: null, error: 'Membership is not active' }
    }

    if (requiredRole && !requiredRole.includes(membership.role)) {
        return { access: null, error: 'Insufficient permissions' }
    }

    return { access: { user, role: membership.role }, error: null }
}

// GET /api/tenants/[id] - Get tenant details with white-label config
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tenantId } = await params
    const supabase = await createServerSupabaseClient()

    const { access, error } = await getUserWithTenantAccess(supabase, tenantId)
    if (error || !access) {
        return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    try {
        const { data: tenant, error: fetchError } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', tenantId)
            .single()

        if (fetchError || !tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
        }

        // Include white_label_config in response
        return NextResponse.json({
            tenant: {
                ...tenant,
                white_label_config: tenant.white_label_config as WhiteLabelConfig | null
            }
        })
    } catch (err) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// PUT /api/tenants/[id] - Update tenant settings
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tenantId } = await params
    const supabase = await createServerSupabaseClient()

    // Require owner or admin role
    const { access, error } = await getUserWithTenantAccess(
        supabase,
        tenantId,
        ['owner', 'admin']
    )
    if (error || !access) {
        return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { name, settings, white_label_config, status } = body as TenantUpdate

        // Build update object
        const updateData: Record<string, unknown> = {}
        
        if (name) updateData.name = name
        if (status) updateData.status = status
        if (settings) {
            // Merge with existing settings
            const { data: existing } = await supabase
                .from('tenants')
                .select('settings')
                .eq('id', tenantId)
                .single()
            updateData.settings = { ...existing?.settings, ...settings }
        }
        if (white_label_config) {
            // Merge with existing white_label_config
            const { data: existing } = await supabase
                .from('tenants')
                .select('white_label_config')
                .eq('id', tenantId)
                .single()
            updateData.white_label_config = { 
                ...(existing?.white_label_config as Record<string, unknown> || {}), 
                ...white_label_config 
            }
        }

        updateData.updated_at = new Date().toISOString()

        const { data: updatedTenant, error: updateError } = await supabase
            .from('tenants')
            .update(updateData)
            .eq('id', tenantId)
            .select()
            .single()

        if (updateError) {
            console.error('Error updating tenant:', updateError)
            return NextResponse.json(
                { error: 'Failed to update tenant' },
                { status: 500 }
            )
        }

        return NextResponse.json({ tenant: updatedTenant })
    } catch (err) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
