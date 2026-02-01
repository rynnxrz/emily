"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

// Default Emily brand configuration
const EMILY_DEFAULTS = {
  brand_name: "Emily",
  logo_url: null,
  primary_color: "#1a2b4c",
  accent_color: "#c9a227",
  background_color: "#f5f0e6",
  text_color: "#1a1a1a",
}

export interface WhiteLabelConfig {
  brand_name?: string | null
  logo_url?: string | null
  primary_color?: string | null
  accent_color?: string | null
  background_color?: string | null
  text_color?: string | null
  navigation_links?: Array<{
    label: string
    href: string
  }>
}

interface WhiteLabelHeaderProps {
  config?: WhiteLabelConfig | null
  className?: string
  showNavigation?: boolean
}

export function WhiteLabelHeader({
  config,
  className,
  showNavigation = true,
}: WhiteLabelHeaderProps) {
  // Merge tenant config with Emily defaults
  const brandConfig = React.useMemo(() => {
    const merged = { ...EMILY_DEFAULTS }
    if (config) {
      if (config.brand_name) merged.brand_name = config.brand_name
      if (config.logo_url) merged.logo_url = config.logo_url
      if (config.primary_color) merged.primary_color = config.primary_color
      if (config.accent_color) merged.accent_color = config.accent_color
      if (config.background_color) merged.background_color = config.background_color
      if (config.text_color) merged.text_color = config.text_color
    }
    return merged
  }, [config])

  // Default navigation links
  const defaultNavLinks = [
    { label: "RENTAL", href: "/catalog" },
    { label: "WHOLESALE", href: "/wholesale" },
    { label: "ARCHIVE", href: "/archive" },
  ]

  const navLinks = config?.navigation_links || defaultNavLinks

  // Check if this is a white-label tenant (not Emily)
  const isWhiteLabel = config && config.brand_name && config.brand_name !== "Emily"

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b",
        className
      )}
      style={{
        backgroundColor: brandConfig.background_color,
        borderColor: brandConfig.primary_color,
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-4">
            {brandConfig.logo_url ? (
              <img
                src={brandConfig.logo_url}
                alt={brandConfig.brand_name}
                className="h-8 w-auto object-contain"
              />
            ) : (
              <Link
                href="/"
                className="text-2xl font-bold tracking-widest uppercase"
                style={{ color: brandConfig.primary_color }}
              >
                {brandConfig.brand_name}
              </Link>
            )}
            {isWhiteLabel && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: brandConfig.accent_color,
                  color: brandConfig.background_color,
                }}
              >
                Partner
              </span>
            )}
          </div>

          {/* Navigation */}
          {showNavigation && (
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wide uppercase hover:opacity-80 transition-opacity"
                  style={{ color: brandConfig.text_color }}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Link
              href="/search"
              className="text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ color: brandConfig.text_color }}
            >
              Search
            </Link>
            <Link
              href="/request-access"
              className="px-4 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: brandConfig.primary_color,
                color: "#ffffff",
              }}
            >
              {isWhiteLabel ? "Request Access" : "Request Access"}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showNavigation && (
          <nav className="md:hidden py-3 border-t" style={{ borderColor: brandConfig.primary_color }}>
            <div className="flex overflow-x-auto gap-4 pb-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium tracking-wide whitespace-nowrap"
                  style={{ color: brandConfig.text_color }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  )
}

export default WhiteLabelHeader
