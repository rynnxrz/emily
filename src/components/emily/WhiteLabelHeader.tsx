"use client"

import * as React from "react"
import Link from "next/link"
import { TenantSwitcher } from "./TenantSwitcher"

export interface WhiteLabelConfig {
  brand_name?: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  background_color?: string
  text_color?: string
  navigation_links?: Array<{ label: string; url: string }>
}

interface WhiteLabelHeaderProps {
  config?: WhiteLabelConfig
  tenant?: {
    id: string
    name: string
    slug: string
    plan: string
    logo_url?: string
  }
  showTenantSwitcher?: boolean
}

const EMILY_DEFAULTS = {
  brand_name: "Emily",
  logo_url: null,
  primary_color: "#1a2b4c",  // Deep navy
  secondary_color: "#c9a227", // Gold
  background_color: "#f5f0e6", // Cream
  text_color: "#1a2b4c",
  accent_color: "#c9a227",
}

export function WhiteLabelHeader({
  config,
  tenant,
  showTenantSwitcher = true,
}: WhiteLabelHeaderProps) {
  // Merge config with defaults
  const mergedConfig = {
    ...EMILY_DEFAULTS,
    ...config,
  }
  
  const brandName = tenant?.name || mergedConfig.brand_name
  const logoUrl = tenant?.logo_url || mergedConfig.logo_url
  
  // Dynamic styles based on config
  const headerStyle = {
    backgroundColor: mergedConfig.background_color,
    borderColor: mergedConfig.primary_color,
  }
  
  const textStyle = {
    color: mergedConfig.text_color,
  }
  
  const accentStyle = {
    color: mergedConfig.accent_color,
  }
  
  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={headerStyle}
    >
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt={brandName} className="h-8 w-auto" />
          ) : (
            <span
              className="text-xl font-bold tracking-widest"
              style={textStyle}
            >
              {brandName?.toUpperCase()}
            </span>
          )}
          
          {/* Partner badge for white-label */}
          {tenant && tenant.id !== "default" && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: mergedConfig.accent_color,
                color: "#fff",
              }}
            >
              Partner
            </span>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {(mergedConfig.navigation_links || []).map((link, index) => (
            <Link
              key={index}
              href={link.url}
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={textStyle}
            >
              {link.label.toUpperCase()}
            </Link>
          ))}
        </nav>
        
        {/* Tenant Switcher (if enabled and tenant provided) */}
        {showTenantSwitcher && tenant && (
          <TenantSwitcher
            tenants={[
              {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                plan: tenant.plan,
                logo_url: tenant.logo_url,
              },
            ]}
            defaultTenantId={tenant.id}
          />
        )}
      </div>
    </header>
  )
}
