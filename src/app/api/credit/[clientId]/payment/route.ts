import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from "@/lib/supabase/server"

// POST /api/credit/[clientId]/payment - Record payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { amount, method = 'BANK_TRANSFER', reference, notes } = body

  if (!amount || amount <= 0) {
    return NextResponse.json(
      { error: 'Valid payment amount is required' },
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

  const newBalance = Math.max(0, creditProfile.current_balance - amount)
  const newAvailable = creditProfile.available_credit + amount

  // Update credit profile
  const { error: updateError } = await supabase
    .from('credit_profiles')
    .update({
      current_balance: newBalance,
      available_credit: newAvailable,
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
      type: 'PAYMENT',
      amount: -amount, // Negative for payments
      balance_after: newBalance,
      description: `Payment received: ${method}`,
      metadata: { method, reference, notes },
    })

  if (transError) {
    return NextResponse.json(
      { error: transError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    message: 'Payment recorded successfully',
    payment: {
      amount,
      method,
      reference,
      newBalance,
      newAvailable,
    },
  })
}
