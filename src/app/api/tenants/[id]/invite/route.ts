import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextResponse } from 'next/server'
import type { InviteRequest, InviteResponse } from '@/types'

// Helper to get current user and check tenant access
async function getUserWithTenantAccess(supabase: any, tenantId: string, requiredRole: string[]) {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return { access: null, error: 'Unauthorized' }
    }

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

    if (!requiredRole.includes(membership.role)) {
        return { access: null, error: 'Insufficient permissions' }
    }

    return { access: { user, role: membership.role }, error: null }
}

// POST /api/tenants/[id]/invite - Invite user to tenant
export async function POST(
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
        const body = await request.json() as InviteRequest
        const { email, role } = body

        // Validate input
        if (!email || !role) {
            return NextResponse.json(
                { error: 'Email and role are required' },
                { status: 400 }
            )
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Invalid email format' },
                { status: 400 }
            )
        }

        // Validate role
        if (!['admin', 'member', 'viewer'].includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be admin, member, or viewer' },
                { status: 400 }
            )
        }

        // Check tenant member limits
        const { data: tenant } = await supabase
            .from('tenants')
            .select('settings')
            .eq('id', tenantId)
            .single()

        if (tenant?.settings?.max_users) {
            const { count: memberCount } = await supabase
                .from('tenant_members')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('status', 'active')

            if (memberCount && memberCount >= tenant.settings.max_users) {
                return NextResponse.json(
                    { error: 'Maximum member limit reached' },
                    { status: 403 }
                )
            }
        }

        // Check if user is already a member or invited
        const { data: existingMember } = await supabase
            .from('tenant_members')
            .select('id, status')
            .eq('tenant_id', tenantId)
            .eq('email', email)
            .single()

        if (existingMember) {
            if (existingMember.status === 'active') {
                return NextResponse.json(
                    { error: 'User is already a member of this tenant' },
                    { status: 409 }
                )
            }
            if (existingMember.status === 'invited') {
                return NextResponse.json(
                    { error: 'User has already been invited' },
                    { status: 409 }
                )
            }
        }

        // Generate invite token
        const inviteToken = `${tenantId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

        // Create invite record
        const { data: invite, error: inviteError } = await supabase
            .from('tenant_members')
            .insert({
                tenant_id: tenantId,
                user_id: null, // Will be linked when user accepts
                email,
                role,
                status: 'invited',
                invited_at: new Date().toISOString(),
                invite_token: inviteToken
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Error creating invite:', inviteError)
            return NextResponse.json(
                { error: 'Failed to create invite' },
                { status: 500 }
            )
        }

        // TODO: Send invite email (integrate with email service)
        console.log(`Invite sent to ${email} for tenant ${tenantId}`)

        const response: InviteResponse = {
            id: invite.id,
            email: invite.email,
            role: invite.role,
            invite_token: inviteToken,
            expires_at: expiresAt
        }

        return NextResponse.json({ invite: response }, { status: 201 })
    } catch (err) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
