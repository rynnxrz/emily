import { createServerSupabaseClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from 'next/server'

// GET /api/white-label/[tenantSlug]/css
// Generate CSS variables as inline styles - Cached for performance
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
      .select('id, name, primary_color, secondary_color')
      .eq('slug', tenantSlug)
      .eq('status', 'active')
      .single()

    if (tenantError || !tenant) {
      return new NextResponse('/* Tenant not found */', {
        status: 404,
        headers: {
          'Content-Type': 'text/css',
        },
      })
    }

    // Get white-label config
    const { data: wlConfig, error: wlError } = await supabase
      .from('white_label_configs')
      .select('*')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true)
      .single()

    // Build CSS variables
    let css = `:root {
    /* Brand Colors */
    --brand-primary: ${wlConfig?.primary_color || tenant.primary_color || '#3B82F6'};
    --brand-primary-foreground: ${wlConfig?.primary_foreground_color || '#FFFFFF'};
    --brand-secondary: ${wlConfig?.secondary_color || tenant.secondary_color || '#F3F4F6'};
    --brand-secondary-foreground: ${wlConfig?.secondary_foreground_color || '#1F2937'};
    --brand-accent: ${wlConfig?.accent_color || '#10B981'};
    --brand-accent-foreground: ${wlConfig?.accent_foreground_color || '#FFFFFF'};
    
    /* Background Colors */
    --brand-background: ${wlConfig?.background_color || '#FFFFFF'};
    --brand-background-secondary: ${wlConfig?.background_secondary_color || '#F9FAFB'};
    
    /* Text Colors */
    --brand-text-primary: ${wlConfig?.text_primary_color || '#111827'};
    --brand-text-secondary: ${wlConfig?.text_secondary_color || '#6B7280'};
    --brand-text-muted: ${wlConfig?.text_muted_color || '#9CA3AF'};
    
    /* Border Colors */
    --brand-border: ${wlConfig?.border_color || '#E5E7EB'};
    
    /* Typography */
    --brand-font-heading: ${wlConfig?.font_heading || 'inherit'};
    --brand-font-body: ${wlConfig?.font_body || 'sans-serif'};
    --brand-font-base-size: ${wlConfig?.font_base_size || '16px'};
}`

    // Add custom CSS if present
    if (wlConfig?.custom_css) {
      css += `\n\n/* Custom CSS */\n${wlConfig.custom_css}`
    }

    // Add body-level overrides for common elements
    css += `

/* Body-level brand application */
body {
    --tw-text-primary: var(--brand-text-primary);
    --tw-text-secondary: var(--brand-text-secondary);
    --tw-bg-primary: var(--brand-background);
    --tw-bg-secondary: var(--brand-background-secondary);
    --tw-border-color: var(--brand-border);
}

/* Apply primary color to interactive elements */
button, .btn-primary {
    background-color: var(--brand-primary);
    color: var(--brand-primary-foreground);
}

/* Apply accent color to highlights */
.accent, .highlight {
    color: var(--brand-accent);
}
`

    // Return CSS with caching headers
    const response = new NextResponse(css, {
      headers: {
        'Content-Type': 'text/css',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400', // Cache for 1 hour
      },
    })

    return response
  } catch (error) {
    console.error('Error generating CSS variables:', error)
    return new NextResponse('/* Error generating styles */', {
      status: 500,
      headers: {
        'Content-Type': 'text/css',
      },
    })
  }
}
