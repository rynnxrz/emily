import { createServerSupabaseClient } from "@/lib/supabase/server"
import { createServiceSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from 'next/server'

// PUT /api/admin/white-label
// Update white-label config - Admin only
export async function PUT(request: NextRequest) {
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

    // Determine tenant_id
    const tenantId = isAdmin ? null : membership?.tenant_id

    const body = await request.json()
    const {
      tenant_id: bodyTenantId,
      brand_name,
      brand_tagline,
      logo_url,
      favicon_url,
      logo_dark_url,
      primary_color,
      primary_foreground_color,
      secondary_color,
      secondary_foreground_color,
      accent_color,
      accent_foreground_color,
      background_color,
      background_secondary_color,
      text_primary_color,
      text_secondary_color,
      text_muted_color,
      border_color,
      font_heading,
      font_body,
      font_base_size,
      custom_css,
      contact_email,
      contact_phone,
      contact_address,
      social_links,
      features,
      meta_title,
      meta_description,
      meta_keywords,
      is_active,
    } = body

    // For admins, require tenant_id in body; for tenant admins, use their tenant
    const targetTenantId = isAdmin ? bodyTenantId : tenantId

    if (!targetTenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      )
    }

    // Check if config exists for tenant
    const { data: existingConfig } = await supabase
      .from('white_label_configs')
      .select('id')
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true)
      .single()

    const configData = {
      tenant_id: targetTenantId,
      brand_name,
      brand_tagline,
      logo_url,
      favicon_url,
      logo_dark_url,
      primary_color,
      primary_foreground_color,
      secondary_color,
      secondary_foreground_color,
      accent_color,
      accent_foreground_color,
      background_color,
      background_secondary_color,
      text_primary_color,
      text_secondary_color,
      text_muted_color,
      border_color,
      font_heading,
      font_body,
      font_base_size,
      custom_css,
      contact_email,
      contact_phone,
      contact_address,
      social_links,
      features,
      meta_title,
      meta_description,
      meta_keywords,
      is_active: is_active !== undefined ? is_active : true,
      updated_at: new Date().toISOString(),
    }

    let result

    if (existingConfig) {
      // Update existing config
      const { data, error } = await serviceClient
        .from('white_label_configs')
        .update(configData)
        .eq('id', existingConfig.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating white-label config:', error)
        return NextResponse.json(
          { error: 'Failed to update white-label config' },
          { status: 500 }
        )
      }

      result = data
    } else {
      // Create new config
      const { data, error } = await serviceClient
        .from('white_label_configs')
        .insert(configData)
        .select()
        .single()

      if (error) {
        console.error('Error creating white-label config:', error)
        return NextResponse.json(
          { error: 'Failed to create white-label config' },
          { status: 500 }
        )
      }

      result = data
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: existingConfig 
        ? 'White-label config updated successfully' 
        : 'White-label config created successfully',
    })
  } catch (error) {
    console.error('Error in PUT /api/admin/white-label:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET /api/admin/white-label
// Get white-label config for admin
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
    const { data: wlConfig, error } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('tenant_id', targetTenantId)
      .eq('is_active', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching white-label config:', error)
      return NextResponse.json(
        { error: 'Failed to fetch white-label config' },
        { status: 500 }
      )
    }

    // Get tenant info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .eq('id', targetTenantId)
      .single()

    return NextResponse.json({
      tenant,
      config: wlConfig || null,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/white-label:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
