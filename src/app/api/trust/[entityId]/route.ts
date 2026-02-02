import { NextRequest, NextResponse } from 'next/server'

// GET /api/trust/[entityId] - Get trust rating for entity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params
  
  // Mock data - replace with actual database query
  const trustRating = {
    entityId,
    overallScore: 4.2,
    totalReviews: 127,
    averageRating: 4.5,
    category: 'service',
    lastUpdated: new Date().toISOString(),
    breakdown: {
      reliability: 4.3,
      responsiveness: 4.1,
      quality: 4.4,
      communication: 4.0
    },
    trustLevel: 'high'
  }
  
  return NextResponse.json(trustRating)
}
