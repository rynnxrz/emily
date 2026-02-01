"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CreditTermsBadgeProps {
    termType?: string | null
    customDays?: number | null
    discountPercent?: number | null
    discountDays?: number | null
    showDetails?: boolean
    size?: "sm" | "default" | "lg"
    variant?: "default" | "secondary" | "outline" | "success" | "warning"
    className?: string
}

const termTypeLabels: Record<string, string> = {
    NET_15: "Net 15",
    NET_30: "Net 30",
    NET_45: "Net 45",
    NET_60: "Net 60",
    NET_90: "Net 90",
    COD: "COD",
    PREPAID: "Prepaid",
    CUSTOM: "Custom",
}

const termTypeDescriptions: Record<string, string> = {
    NET_15: "Payment due within 15 days",
    NET_30: "Payment due within 30 days",
    NET_45: "Payment due within 45 days",
    NET_60: "Payment due within 60 days",
    NET_90: "Payment due within 90 days",
    COD: "Payment on delivery",
    PREPAID: "Payment in advance",
    CUSTOM: "Custom payment terms",
}

const variantMap: Record<string, "default" | "secondary" | "outline" | "success" | "warning"> = {
    default: "default",
    secondary: "secondary",
    outline: "outline",
    success: "secondary",
    warning: "outline",
}

export function CreditTermsBadge({
    termType,
    customDays,
    discountPercent,
    discountDays,
    showDetails = false,
    size = "default",
    variant = "default",
    className,
}: CreditTermsBadgeProps) {
    if (!termType) {
        return (
            <Badge
                variant="outline"
                className={cn("font-mono text-xs", className)}
            >
                Standard
            </Badge>
        )
    }

    const label = termTypeLabels[termType] || termType
    
    // For custom terms with days
    const displayText = termType === "CUSTOM" && customDays
        ? `Net ${customDays}`
        : label

    // Get effective variant based on term type
    const getVariant = () => {
        if (variant !== "default") return variantMap[variant]
        
        // COD and Prepaid get special styling
        if (termType === "COD") return "warning"
        if (termType === "PREPAID") return "success"
        return "default"
    }

    return (
        <div className={cn("inline-flex flex-col gap-1", className)}>
            <Badge
                variant={getVariant()}
                className={cn(
                    size === "sm" && "text-[10px] h-5 px-1.5",
                    size === "lg" && "h-7 text-sm px-3",
                )}
            >
                {displayText}
            </Badge>
            
            {showDetails && (
                <div className="flex flex-wrap gap-1">
                    {/* Early payment discount indicator */}
                    {discountPercent && discountPercent > 0 && discountDays && (
                        <span className="text-[10px] text-muted-foreground">
                            {discountPercent}% discount if paid within {discountDays} days
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

// Compact version for table cells
export function CreditTermsBadgeCompact({
    termType,
    customDays,
    className,
}: Omit<CreditTermsBadgeProps, "showDetails" | "size" | "variant">) {
    if (!termType) return null

    const label = termTypeLabels[termType] || termType
    const displayText = termType === "CUSTOM" && customDays
        ? `${customDays}d`
        : label.replace("NET_", "").replace("_", "-")

    return (
        <span className={cn("font-mono text-xs bg-muted px-1.5 py-0.5 rounded", className)}>
            {displayText}
        </span>
    )
}

// Status badge for credit account
interface CreditStatusBadgeProps {
    status?: string | null
    showLabel?: boolean
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    ACTIVE: { label: "Active", variant: "success" },
    SUSPENDED: { label: "Suspended", variant: "destructive" },
    EXPIRED: { label: "Expired", variant: "outline" },
    PENDING_APPROVAL: { label: "Pending", variant: "secondary" },
}

export function CreditStatusBadge({
    status,
    showLabel = true,
}: CreditStatusBadgeProps) {
    if (!status) return null

    const config = statusConfig[status] || { label: status, variant: "outline" }
    const variant = config.variant === "success" ? "default" : config.variant

    return (
        <Badge variant={variant} className={cn(!showLabel && "px-1")}>
            {showLabel ? config.label : "●"}
        </Badge>
    )
}
