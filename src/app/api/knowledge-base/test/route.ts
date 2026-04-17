import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// POST /api/knowledge-base/test - Test knowledge base search
export async function POST(request: NextRequest) {
  try {
    const { query, kbIds, strategy, confidenceThreshold } = await request.json()

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      )
    }

    // Build the query based on strategy
    let kbQuery = supabaseAdmin
      .from('knowledge_base')
      .select('*')

    // Filter by KB IDs if provided
    if (kbIds && kbIds.length > 0) {
      kbQuery = kbQuery.in('id', kbIds)
    }

    // Simple search implementation (can be enhanced with vector search)
    const { data: kbItems, error } = await kbQuery

    if (error) throw error

    if (!kbItems || kbItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          results: [],
          message: 'No knowledge base items found',
          strategy: strategy || 'relevant',
          confidenceThreshold: confidenceThreshold || 70
        }
      })
    }

    // Simple matching algorithm (can be replaced with embedding similarity)
    const queryLower = query.toLowerCase()
    const results = kbItems
      .map((item: any) => {
        const contentLower = (item.content || '').toLowerCase()
        const titleLower = (item.title || '').toLowerString()

        // Calculate simple relevance score
        let score = 0
        const queryWords = queryLower.split(/\s+/)

        queryWords.forEach((word: string) => {
          if (titleLower.includes(word)) score += 3
          if (contentLower.includes(word)) score += 1
        })

        // Normalize score to percentage (capped at 100)
        const maxPossibleScore = queryWords.length * 4
        const confidence = Math.min(Math.round((score / maxPossibleScore) * 100), 100)

        return {
          ...item,
          confidence,
          matched: confidence >= (confidenceThreshold || 70)
        }
      })
      .filter((item: any) => {
        if (strategy === 'always') return true
        if (strategy === 'never') return false
        return item.matched
      })
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, 5) // Top 5 results

    return NextResponse.json({
      success: true,
      data: {
        results,
        totalResults: results.length,
        strategy: strategy || 'relevant',
        confidenceThreshold: confidenceThreshold || 70,
        query
      }
    })
  } catch (error: any) {
    console.error('Knowledge base test error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
