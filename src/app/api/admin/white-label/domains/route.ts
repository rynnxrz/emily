import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createServiceSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/white-label/domains
// Add custom domain - Admin only
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const serviceClient = createServiceSupabaseClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Get user's tenant membership
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single()

    if (!isAdmin && !membership) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { tenant_id: bodyTenantId, domain, is_primary } = body

    // Determine tenant_id
    const tenantId = isAdmin ? bodyTenantId : membership?.tenant_id

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      )
    }

    // Validate domain format
    const domainRegex = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63}(?<!-))+$/
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      )
    }

    // Get white-label config for tenant
    const { data: wlConfig } = await supabase
      .from('white_label_configs')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (!wlConfig) {
      return NextResponse.json(
        { error: 'White-label config not found for tenant. Create a config first.' },
        { status: 404 }
      )
    }

    // Check if domain already exists
    const { data: existingDomain } = await supabase
      .from('white_label_domains')
      .select('id, status')
      .eq('domain', domain.toLowerCase())
      .single()

    if (existingDomain) {
      return NextResponse.json(
        { error: 'Domain already registered', domain: existingDomain },
        { status: 409 }
      )
    }

    // If setting as primary, unset other primary domains
    if (is_primary) {
      await serviceClient
        .from('white_label_domains')
        .update({ is_primary: false })
        .eq('config_id', wlConfig.id)
    }

    // Generate verification token
    const verificationToken = generateVerificationToken()

    // Create domain record
    const { data: newDomain, error } = await serviceClient
      .from('white_label_domains')
      .insert({
        config_id: wlConfig.id,
        domain: domain.toLowerCase(),
        is_primary: is_primary || false,
        status: 'pending',
        verification_token: verificationToken,
        dns_records: {
          recommended: [
            { type: 'CNAME', name: domain, value: `${tenantId}.white-label.example.com` },
          ],
        },
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating domain:', error)
      return NextResponse.json(
        { error: 'Failed to add domain' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newDomain.id,
        domain: newDomain.domain,
        is_primary: newDomain.is_primary,
        status: newDomain.status,
        verification_token: verificationToken,
        dns_records: newDomain.dns_records,
      },
      message: 'Domain added successfully. Configure DNS records and verify to activate.',
    })
  } catch (error) {
    console.error('Error in POST /api/admin/white-label/domains:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/admin/white-label/domains
// List domains for tenant - Admin only
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenant_id')

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = profile?.role === 'admin'

    // Get user's tenant membership
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .in('role', ['admin', 'owner'])
      .single()

    if (!isAdmin && !membership) {
      return NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      )
    }

    // Determine target tenant
    const targetTenantId = isAdmin && tenantId ? tenantId : (membership?.tenant_id || tenantId)

    if (!targetTenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Get white-label config
    const { data: wlConfig } = await supabase
      .from('white_label_configs')
      .select('id')
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true)
      .single()

    if (!wlConfig) {
      return NextResponse.json({
        domains: [],
        message: 'No white-label config found for tenant',
      })
    }

    // Get domains
    const { data: domains, error } = await supabase
      .from('white_label_domains')
      .select('*')
      .eq('config_id', wlConfig.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching domains:', error)
      return NextResponse.json(
        { error: 'Failed to fetch domains' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      domains: domains || [],
    })
  } catch (error) {
    console.error('Error in GET /api/admin/white-label/domains:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate verification token
function generateVerificationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}
