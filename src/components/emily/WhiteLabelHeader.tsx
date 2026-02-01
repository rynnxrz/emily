"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TenantSwitcher } from "./TenantSwitcher"
import { Button } from "@/components/ui/button"
import { 
    Building2,
    Globe,
    Mail,
    Phone,
    Menu,
    X,
    ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

interface WhiteLabelConfig {
    brand_name?: string | null
    brand_tagline?: string | null
    logo_url?: string | null
    favicon_url?: string | null
    primary_color?: string | null
    contact_email?: string | null
    contact_phone?: string | null
    social_links?: Record<string, string> | null
}

interface WhiteLabelHeaderProps {
    config?: WhiteLabelConfig | null
    tenantName?: string
    currentTenantId?: string
    showTenantSwitcher?: boolean
    tenants?: Array<{
        id: string
        name: string
        slug: string
        logo_url?: string | null
        plan?: string
    }>
    onTenantChange?: (tenantId: string) => void
    onCreateTenant?: () => void
    onManageTenant?: () => void
    className?: string
}

export function WhiteLabelHeader({
    config,
    tenantName,
    currentTenantId,
    showTenantSwitcher = false,
    tenants = [],
    onTenantChange,
    onCreateTenant,
    onManageTenant,
    className,
}: WhiteLabelHeaderProps) {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Prevent hydration mismatch
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <header className={cn("sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md", className)}>
                <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-[1920px] mx-auto">
                    <div className="h-8 w-40 bg-muted animate-pulse rounded" />
                </div>
            </header>
        )
    }

    const brandName = config?.brand_name || tenantName || "Emily"
    const logoUrl = config?.logo_url
    const tagline = config?.brand_tagline

    return (
        <header
            className={cn(
                "sticky top-0 z-50 w-full border-b backdrop-blur-md transition-colors",
                "bg-white/90 dark:bg-gray-950/90",
                className
            )}
            style={config?.primary_color ? { borderColor: `${config.primary_color}20` } : undefined}
        >
            <div className="flex h-16 items-center justify-between px-4 sm:px-8 max-w-[1920px] mx-auto">
                {/* Left side: Brand + Tenant Switcher */}
                <div className="flex items-center gap-4">
                    {/* Brand/Logo */}
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-lg font-medium tracking-wide hover:opacity-80 transition-opacity"
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt={brandName}
                                className="h-8 w-auto max-w-[160px] object-contain"
                            />
                        ) : (
                            <Building2 className="h-6 w-6" style={config?.primary_color ? { color: config.primary_color } : undefined} />
                        )}
                        {logoUrl ? null : (
                            <span>{brandName}</span>
                        )}
                    </Link>

                    {/* Tenant Switcher (if enabled) */}
                    {showTenantSwitcher && (
                        <div className="hidden md:block border-l pl-4 ml-2">
                            <TenantSwitcher
                                currentTenant={
                                    currentTenantId
                                        ? {
                                              id: currentTenantId,
                                              name: tenantName || "Organization",
                                              slug: "",
                                          }
                                        : undefined
                                }
                                tenants={tenants}
                                onTenantChange={(tenant) => onTenantChange?.(tenant.id)}
                                onCreateTenant={onCreateTenant}
                                onManageTenants={onManageTenant}
                            />
                        </div>
                    )}
                </div>

                {/* Center: Tagline (if exists) */}
                {tagline && (
                    <div className="hidden lg:block text-sm text-muted-foreground">
                        {tagline}
                    </div>
                )}

                {/* Right side: Contact + Actions */}
                <div className="flex items-center gap-4">
                    {/* Contact Info */}
                    <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                        {config?.contact_email && (
                            <a
                                href={`mailto:${config.contact_email}`}
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                <span className="hidden lg:inline">{config.contact_email}</span>
                            </a>
                        )}
                        {config?.contact_phone && (
                            <a
                                href={`tel:${config.contact_phone}`}
                                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                <span className="hidden lg:inline">{config.contact_phone}</span>
                            </a>
                        )}
                    </div>

                    {/* Social Links */}
                    {config?.social_links && Object.keys(config.social_links).length > 0 && (
                        <div className="hidden md:flex items-center gap-2">
                            {config.social_links.website && (
                                <a
                                    href={config.social_links.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                </a>
                            )}
                        </div>
                    )}

                    {/* Mobile Menu Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-5 w-5" />
                        ) : (
                            <Menu className="h-5 w-5" />
                        )}
                    </Button>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm">
                    <div className="flex flex-col p-4 gap-4">
                        {/* Mobile Tenant Switcher */}
                        {showTenantSwitcher && (
                            <TenantSwitcher
                                currentTenant={
                                    currentTenantId
                                        ? {
                                              id: currentTenantId,
                                              name: tenantName || "Organization",
                                              slug: "",
                                          }
                                        : undefined
                                }
                                tenants={tenants}
                                onTenantChange={(tenant) => {
                                    onTenantChange?.(tenant.id)
                                    setIsMobileMenuOpen(false)
                                }}
                                onCreateTenant={onCreateTenant}
                                onManageTenants={onManageTenant}
                            />
                        )}

                        {/* Mobile Contact Info */}
                        <div className="flex flex-col gap-2 text-sm">
                            {config?.contact_email && (
                                <a
                                    href={`mailto:${config.contact_email}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Mail className="w-4 h-4" />
                                    {config.contact_email}
                                </a>
                            )}
                            {config?.contact_phone && (
                                <a
                                    href={`tel:${config.contact_phone}`}
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <Phone className="w-4 h-4" />
                                    {config.contact_phone}
                                </a>
                            )}
                            {config?.social_links?.website && (
                                <a
                                    href={config.social_links.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Website
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
