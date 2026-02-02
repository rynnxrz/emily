import { NextRequest, NextResponse } from 'next/server'

// GET /api/trust/[entityId]/reviews - Get public reviews for entity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  
  // Mock data - replace with actual database query
  const reviews = {
    entityId,
    page,
    limit,
    total: 42,
    hasMore: true,
    reviews: [
      {
        id: 'rev_001',
        authorId: 'user_123',
        authorName: 'John D.',
        rating: 5,
        title: 'Excellent service!',
        content: 'Was very professional and completed the work ahead of schedule.',
        helpful: 24,
        createdAt: '2026-01-28T10:30:00Z',
        verified: true
      },
      {
        id: 'rev_002',
        authorId: 'user_456',
        authorName: 'Sarah M.',
        rating: 4,
        title: 'Good work, minor delays',
        content: 'Overall satisfied with the results. Communication could be better.',
        helpful: 12,
        createdAt: '2026-01-25T14:15:00Z',
        verified: true
      }
    ]
  }
  
  return NextResponse.json(reviews)
}

// POST /api/trust/[entityId]/reviews - Submit new review
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ entityId: string }> }
) {
  const { entityId } = await params
  
  try {
    const body = await request.json()
    const { rating, title, content, authorId } = body
    
    // Validate required fields
    if (!rating || !content || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields: rating, content, authorId' },
        { status: 400 }
      )
    }
    
    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }
    
    // Mock creation - replace with actual database insert
    const newReview = {
      id: `rev_${Date.now()}`,
      entityId,
      authorId,
      rating,
      title: title || '',
      content,
      helpful: 0,
      createdAt: new Date().toISOString(),
      verified: false,
      status: 'pending'
    }
    
    return NextResponse.json(newReview, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
