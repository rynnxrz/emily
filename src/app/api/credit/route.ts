import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from "@/lib/supabase/server"

// POST /api/credit - Apply for credit (new client)
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const {
    clientId,
    creditLimit = 5000,
    paymentTerms = 'NET30',
    interestRate = 0,
  } = body

  if (!clientId) {
    return NextResponse.json(
      { error: 'clientId is required' },
      { status: 400 }
    )
  }

  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, company_name, full_name')
    .eq('id', clientId)
    .single()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Client profile not found' },
      { status: 404 }
    )
  }

  // Check if credit profile already exists
  const { data: existing } = await supabase
    .from('credit_profiles')
    .select('id')
    .eq('client_id', clientId)
    .single()

  if (existing) {
    return NextResponse.json(
      { error: 'Credit profile already exists for this client' },
      { status: 409 }
    )
  }

  // Create credit profile
  const { data: creditProfile, error } = await supabase
    .from('credit_profiles')
    .insert({
      client_id: clientId,
      credit_limit: creditLimit,
      current_balance: 0,
      available_credit: creditLimit,
      paymentTerms,
      interest_rate: interestRate,
      status: 'ACTIVE',
      approved_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  // Log transaction
  await supabase.from('credit_transactions').insert({
    client_id: clientId,
    type: 'CREDIT_GRANTED',
    amount: creditLimit,
    balance_after: creditLimit,
    description: 'Initial credit limit granted',
  })

  return NextResponse.json({
    message: 'Credit application approved',
    creditProfile,
  }, { status: 201 })
}
