import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Helper to get current user and check tenant access
async function getUserWithTenantAccess(supabase: any, tenantId: string, requiredRole?: string[]) {
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

    if (requiredRole && !requiredRole.includes(membership.role)) {
        return { access: null, error: 'Insufficient permissions' }
    }

    return { access: { user, role: membership.role }, error: null }
}

// GET /api/tenants/[id]/members - List tenant members
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: tenantId } = await params
    const supabase = await createClient()

    const { access, error } = await getUserWithTenantAccess(supabase, tenantId)
    if (error || !access) {
        return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || undefined
    const role = searchParams.get('role') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = (page - 1) * limit

    try {
        let query = supabase
            .from('tenant_members')
            .select('*')
            .eq('tenant_id', tenantId)

        if (status) query = query.eq('status', status)
        if (role) query = query.eq('role', role)

        const { data: members, error: fetchError } = await query
            .order('joined_at', { ascending: false })
            .range(offset, offset + limit - 1)

        if (fetchError) {
            console.error('Error fetching members:', fetchError)
            return NextResponse.json(
                { error: 'Failed to fetch members' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            members: members || [],
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
