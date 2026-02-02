import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from "@/lib/supabase/server"

// POST /api/credit/[clientId]/adjust - Manual balance adjustment (admin)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { amount, type, reason, adminId } = body

  // Validate adjustment type
  if (!['CREDIT', 'DEBIT', 'WRITE_OFF', 'FEE', 'REFUND'].includes(type)) {
    return NextResponse.json(
      { error: 'Invalid adjustment type' },
      { status: 400 }
    )
  }

  if (!reason) {
    return NextResponse.json(
      { error: 'Reason is required for adjustments' },
      { status: 400 }
    )
  }

  // Get current credit profile
  const { data: creditProfile, error: fetchError } = await supabase
    .from('credit_profiles')
    .select('current_balance, available_credit')
    .eq('client_id', clientId)
    .single()

  if (fetchError || !creditProfile) {
    return NextResponse.json(
      { error: 'Credit profile not found' },
      { status: 404 }
    )
  }

  // Calculate new balances
  let balanceChange = 0
  switch (type) {
    case 'CREDIT':
    case 'REFUND':
      balanceChange = amount // Increase available credit
      break
    case 'DEBIT':
    case 'WRITE_OFF':
    case 'FEE':
      balanceChange = -Math.abs(amount) // Decrease available credit
      break
  }

  const newBalance = creditProfile.current_balance + balanceChange
  const newAvailable = creditProfile.available_credit - balanceChange

  // Validate no negative balances
  if (newBalance < 0) {
    return NextResponse.json(
      { error: 'Adjustment would result in negative balance' },
      { status: 400 }
    )
  }

  // Update credit profile
  const { error: updateError } = await supabase
    .from('credit_profiles')
    .update({
      current_balance: newBalance,
      available_credit: Math.max(0, newAvailable),
      updated_at: new Date().toISOString(),
    })
    .eq('client_id', clientId)

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    )
  }

  // Record transaction
  const { error: transError } = await supabase
    .from('credit_transactions')
    .insert({
      client_id: clientId,
      type: `ADJUSTMENT_${type}`,
      amount: balanceChange,
      balance_after: newBalance,
      description: `Manual adjustment: ${reason}`,
      metadata: { 
        adjustmentType: type, 
        reason, 
        adminId,
        originalAmount: amount,
      },
    })

  if (transError) {
    return NextResponse.json(
      { error: transError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Adjustment recorded successfully',
    adjustment: {
      type,
      amount: balanceChange,
      reason,
      newBalance,
      newAvailable: Math.max(0, newAvailable),
      adminId,
    },
  })
}
