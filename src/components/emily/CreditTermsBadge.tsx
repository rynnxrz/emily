import * as React from "react"
import { cn } from "@/lib/utils"

export interface CreditTermsBadgeProps {
  /** Credit terms type: 'Net 30', 'Net 60', 'prepaid', or custom */
  terms: string
  /** Credit limit amount */
  limit: number
  /** Current usage/balance amount */
  usage_balance: number
  /** Optional CSS class name */
  className?: string
}

function CreditTermsBadge({
  terms,
  limit,
  usage_balance,
  className,
}: CreditTermsBadgeProps) {
  // Determine color variant based on terms
  const getVariant = () => {
    const termsLower = terms.toLowerCase()
    if (termsLower.includes("30")) return "credit-net-30"
    if (termsLower.includes("60")) return "credit-net-60"
    if (termsLower.includes("prepaid")) return "credit-prepaid"
    return "credit-default"
  }

  // Calculate usage percentage for display
  const usagePercent = limit > 0 ? Math.round((usage_balance / limit) * 100) : 0

  const variant = getVariant()

  const variantStyles = {
    "credit-net-30": "bg-emerald-100 text-emerald-800 border-emerald-200",
    "credit-net-60": "bg-blue-100 text-blue-800 border-blue-200",
    "credit-prepaid": "bg-amber-100 text-amber-800 border-amber-200",
    "credit-default": "bg-gray-100 text-gray-800 border-gray-200",
  }

  return (
    <div
      data-slot="credit-terms-badge"
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 gap-1.5 transition-[color,box-shadow] overflow-hidden",
        variantStyles[variant as keyof typeof variantStyles],
        className
      )}
    >
      <span className="font-semibold">{terms}</span>
      <span className="opacity-75">
        {usagePercent}% ({usage_balance}/{limit})
      </span>
    </div>
  )
}

export { CreditTermsBadge }
