import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/credit/[clientId] - Get client's credit profile and terms
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()

  // Fetch credit profile
  const { data: creditProfile, error } = await supabase
    .from('credit_profiles')
    .select(`
      *,
      profile:profiles!credit_profiles_client_id_fkey (
        full_name,
        company_name,
        email
      )
    `)
    .eq('client_id', clientId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: 'Credit profile not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ creditProfile })
}
