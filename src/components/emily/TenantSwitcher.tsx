"use client"

import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown } from "lucide-react"

export interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  logo_url?: string
}

interface TenantSwitcherProps {
  tenants: Tenant[]
  defaultTenantId?: string
  onTenantChange?: (tenant: Tenant) => void
  className?: string
}

export function TenantSwitcher({
  tenants,
  defaultTenantId,
  onTenantChange,
  className,
}: TenantSwitcherProps) {
  const [selectedTenant, setSelectedTenant] = React.useState<Tenant | null>(null)

  React.useEffect(() => {
    // Load saved tenant from localStorage
    const savedTenantId = localStorage.getItem("emily-selected-tenant-id")
    if (savedTenantId) {
      const saved = tenants.find((t) => t.id === savedTenantId)
      if (saved) {
        setSelectedTenant(saved)
        return
      }
    }
    
    // Fall back to default or first tenant
    if (defaultTenantId) {
      const found = tenants.find((t) => t.id === defaultTenantId)
      setSelectedTenant(found || tenants[0] || null)
    } else {
      setSelectedTenant(tenants[0] || null)
    }
  }, [tenants, defaultTenantId])

  const handleTenantSelect = (tenant: Tenant) => {
    setSelectedTenant(tenant)
    localStorage.setItem("emily-selected-tenant-id", tenant.id)
    onTenantChange?.(tenant)
  }

  if (!selectedTenant) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`flex items-center gap-2 px-2 py-1.5 h-auto text-sm ${className}`}
        >
          {selectedTenant.logo_url && (
            <img
              src={selectedTenant.logo_url}
              alt={selectedTenant.name}
              className="w-5 h-5 rounded"
            />
          )}
          <span className="font-medium">{selectedTenant.name}</span>
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {selectedTenant.plan.toUpperCase()}
          </Badge>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSelect(tenant)}
            className="flex items-center gap-2 py-2"
          >
            {tenant.logo_url && (
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-6 h-6 rounded"
              />
            )}
            <div className="flex flex-col">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {tenant.slug}
              </span>
            </div>
            {tenant.id === selectedTenant.id && (
              <Badge variant="outline" className="ml-auto text-xs">
                Active
              </Badge>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
