"use client"

import { useState } from "react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
    Building2, 
    ChevronDown, 
    Building,
    Plus,
    Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Tenant {
    id: string
    name: string
    slug: string
    logo_url?: string | null
    plan?: string
    is_current?: boolean
}

interface TenantSwitcherProps {
    tenants?: Tenant[]
    currentTenant?: Tenant
    onTenantChange?: (tenant: Tenant) => void
    onCreateTenant?: () => void
    onManageTenants?: () => void
    className?: string
}

export function TenantSwitcher({
    tenants = [],
    currentTenant,
    onTenantChange,
    onCreateTenant,
    onManageTenants,
    className,
}: TenantSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false)

    const handleTenantSelect = (tenant: Tenant) => {
        onTenantChange?.(tenant)
        setIsOpen(false)
    }

    const getPlanBadgeVariant = (plan?: string): "default" | "secondary" | "outline" | "destructive" => {
        switch (plan) {
            case "enterprise":
                return "default"
            case "professional":
                return "secondary"
            case "basic":
                return "outline"
            default:
                return "outline"
        }
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "flex items-center gap-2 min-w-[200px] justify-between",
                        "hover:bg-accent hover:text-accent-foreground",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {currentTenant?.logo_url ? (
                            <img
                                src={currentTenant.logo_url}
                                alt={currentTenant.name}
                                className="w-5 h-5 rounded object-contain"
                            />
                        ) : (
                            <Building2 className="w-4 h-4 shrink-0" />
                        )}
                        <span className="truncate font-medium">
                            {currentTenant?.name || "Select Organization"}
                        </span>
                    </div>
                    <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="start"
                className="w-[280px]"
                sideOffset={8}
            >
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Organizations</span>
                    {onCreateTenant && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation()
                                onCreateTenant()
                                setIsOpen(false)
                            }}
                            className="h-7 text-xs"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            New
                        </Button>
                    )}
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* Current tenant indicator */}
                {currentTenant && (
                    <DropdownMenuItem
                        className="flex flex-col items-start gap-1 p-3 cursor-default focus:bg-transparent"
                        disabled
                    >
                        <div className="flex items-center gap-2 w-full">
                            {currentTenant.logo_url ? (
                                <img
                                    src={currentTenant.logo_url}
                                    alt={currentTenant.name}
                                    className="w-6 h-6 rounded object-contain"
                                />
                            ) : (
                                <Building2 className="w-5 h-5" />
                            )}
                            <span className="font-medium truncate">
                                {currentTenant.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 w-full ml-8">
                            <Badge
                                variant={getPlanBadgeVariant(currentTenant.plan)}
                                className="text-[10px] h-5"
                            >
                                {currentTenant.plan || "basic"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                Current
                            </span>
                        </div>
                    </DropdownMenuItem>
                )}

                {tenants.length > 0 && tenants.filter(t => t.id !== currentTenant?.id).length > 0 && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Switch to
                        </DropdownMenuLabel>
                    </>
                )}

                {/* Tenant list */}
                {tenants
                    .filter((t) => t.id !== currentTenant?.id)
                    .map((tenant) => (
                        <DropdownMenuItem
                            key={tenant.id}
                            onClick={() => handleTenantSelect(tenant)}
                            className="flex items-center gap-2 p-2"
                        >
                            {tenant.logo_url ? (
                                <img
                                    src={tenant.logo_url}
                                    alt={tenant.name}
                                    className="w-5 h-5 rounded object-contain"
                                />
                            ) : (
                                <Building className="w-4 h-4 text-muted-foreground" />
                            )}
                            <div className="flex flex-col flex-1 min-w-0">
                                <span className="truncate font-medium">
                                    {tenant.name}
                                </span>
                                {tenant.plan && (
                                    <Badge
                                        variant={getPlanBadgeVariant(tenant.plan)}
                                        className="text-[10px] h-4 w-fit mt-0.5"
                                    >
                                        {tenant.plan}
                                    </Badge>
                                )}
                            </div>
                        </DropdownMenuItem>
                    ))
                }

                {/* Management option */}
                {onManageTenants && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => {
                                onManageTenants()
                                setIsOpen(false)
                            }}
                            className="flex items-center gap-2 text-muted-foreground"
                        >
                            <Settings className="w-4 h-4" />
                            <span>Manage Organizations</span>
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
