import { NextRequest, NextResponse } from 'next/server'

// POST /api/trust/[reviewId]/vote - Vote on review helpfulness
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params
  
  try {
    const body = await request.json()
    const { userId, voteType } = body
    
    // Validate required fields
    if (!userId || !voteType) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, voteType' },
        { status: 400 }
      )
    }
    
    // Validate vote type
    if (!['helpful', 'not-helpful'].includes(voteType)) {
      return NextResponse.json(
        { error: 'voteType must be "helpful" or "not-helpful"' },
        { status: 400 }
      )
    }
    
    // Mock vote processing - replace with actual database update
    const voteResult = {
      reviewId,
      userId,
      voteType,
      totalHelpful: voteType === 'helpful' ? 25 : 24,
      totalNotHelpful: voteType === 'not-helpful' ? 3 : 2,
      userVoteRecorded: true,
      votedAt: new Date().toISOString()
    }
    
    return NextResponse.json(voteResult)
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
