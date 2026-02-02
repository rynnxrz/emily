import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credit/[clientId]/summary - Get credit summary
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()

  const { data: creditProfile, error } = await supabase
    .from('credit_profiles')
    .select('credit_limit, current_balance, available_credit, status, payment_terms, interest_rate, approved_at')
    .eq('client_id', clientId)
    .single()

  if (error || !creditProfile) {
    return NextResponse.json(
      { error: 'Credit profile not found' },
      { status: 404 }
    )
  }

  // Get recent transaction counts
  const { count: totalTransactions } = await supabase
    .from('credit_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  const { count: pendingPayments } = await supabase
    .from('credit_transactions')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('type', 'PURCHASE')

  return NextResponse.json({
    summary: {
      clientId,
      limit: creditProfile.credit_limit,
      balance: creditProfile.current_balance,
      available: creditProfile.available_credit,
      utilizationPercent: creditProfile.credit_limit > 0 
        ? (creditProfile.current_balance / creditProfile.credit_limit * 100).toFixed(2)
        : 0,
      status: creditProfile.status,
      paymentTerms: creditProfile.payment_terms,
      interestRate: creditProfile.interest_rate,
      totalTransactions: totalTransactions || 0,
      approvedAt: creditProfile.approved_at,
    },
  })
}
