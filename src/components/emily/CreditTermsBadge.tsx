"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"

interface CreditTermsBadgeProps {
  terms: string
  limit: number
  usage_balance: number
  className?: string
}

export function CreditTermsBadge({
  terms,
  limit,
  usage_balance,
  className,
}: CreditTermsBadgeProps) {
  // Calculate usage percentage
  const usagePercent = limit > 0 ? Math.round((usage_balance / limit) * 100) : 0
  
  // Determine color based on usage
  const getColorVariant = () => {
    if (usagePercent >= 90) return "destructive"  // Red - critical
    if (usagePercent >= 75) return "warning"      // Yellow - warning
    if (usagePercent >= 50) return "secondary"    // Blue - moderate
    return "default"                               // Green - good
  }
  
  // Format terms for display
  const formatTerms = (term: string) => {
    switch (term) {
      case "NET_30":
        return "Net 30"
      case "NET_60":
        return "Net 60"
      case "NET_90":
        return "Net 90"
      case "COD":
        return "COD"
      case "PREPAID":
        return "Prepaid"
      default:
        return term
    }
  }
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge variant={getColorVariant()} className="font-medium">
        {formatTerms(terms)}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {usagePercent}% ({formatCurrency(usage_balance)}/{formatCurrency(limit)})
      </span>
    </div>
  )
}
