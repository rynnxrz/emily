import { NextRequest, NextResponse } from 'next/server'

// GET /api/trust/leaderboard - Get top-rated entities
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const limit = parseInt(searchParams.get('limit') || '10')
  const category = searchParams.get('category')
  
  // Mock data - replace with actual database query
  const leaderboard = {
    limit,
    category: category || 'all',
    lastUpdated: new Date().toISOString(),
    entities: [
      {
        rank: 1,
        entityId: 'ent_001',
        name: 'Top Rated Services',
        score: 4.9,
        totalReviews: 256,
        category: 'service',
        trend: 'up'
      },
      {
        rank: 2,
        entityId: 'ent_002',
        name: 'Quality Builders',
        score: 4.8,
        totalReviews: 189,
        category: 'construction',
        trend: 'stable'
      },
      {
        rank: 3,
        entityId: 'ent_003',
        name: 'Expert Consultants',
        score: 4.7,
        totalReviews: 142,
        category: 'consulting',
        trend: 'up'
      }
    ]
  }
  
  return NextResponse.json(leaderboard)
}
