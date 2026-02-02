import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from 'next/server'

// GET /api/white-label/[tenantSlug]
// Get public white-label config for tenant - No auth required
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await params
    const supabase = await createServerSupabaseClient()

    // Get tenant by slug
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, slug, logo_url, primary_color, secondary_color, settings')
      .eq('slug', tenantSlug)
      .eq('status', 'active')
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    // Get white-label config for tenant
    const { data: wlConfig, error: wlError } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    if (wlError || !wlConfig) {
      // Return basic tenant info if no white-label config
      return NextResponse.json({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
        },
        branding: {
          brand_name: tenant.name,
          logo_url: tenant.logo_url,
          primary_color: tenant.primary_color,
          secondary_color: tenant.secondary_color,
        },
        has_custom_config: false,
      })
    }

    // Return full white-label config
    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      branding: {
        brand_name: wlConfig.brand_name,
        brand_tagline: wlConfig.brand_tagline,
        logo_url: wlConfig.logo_url,
        favicon_url: wlConfig.favicon_url,
        logo_dark_url: wlConfig.logo_dark_url,
        primary_color: wlConfig.primary_color,
        primary_foreground_color: wlConfig.primary_foreground_color,
        secondary_color: wlConfig.secondary_color,
        secondary_foreground_color: wlConfig.secondary_foreground_color,
        accent_color: wlConfig.accent_color,
        accent_foreground_color: wlConfig.accent_foreground_color,
        background_color: wlConfig.background_color,
        background_secondary_color: wlConfig.background_secondary_color,
        text_primary_color: wlConfig.text_primary_color,
        text_secondary_color: wlConfig.text_secondary_color,
        text_muted_color: wlConfig.text_muted_color,
        border_color: wlConfig.border_color,
        font_heading: wlConfig.font_heading,
        font_body: wlConfig.font_body,
        contact_email: wlConfig.contact_email,
        contact_phone: wlConfig.contact_phone,
        contact_address: wlConfig.contact_address,
        social_links: wlConfig.social_links,
        meta_title: wlConfig.meta_title,
        meta_description: wlConfig.meta_description,
        meta_keywords: wlConfig.meta_keywords,
      },
      features: wlConfig.features,
      has_custom_config: true,
      updated_at: wlConfig.updated_at,
    })
  } catch (error) {
    console.error('Error fetching white-label config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
