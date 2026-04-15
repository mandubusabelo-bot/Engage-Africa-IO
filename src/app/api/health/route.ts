import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'engage-africa-io',
    version: '3.0.0',
    env: {
      EVOLUTION_API_URL: process.env.EVOLUTION_API_URL ? '✅ set' : '❌ missing',
      EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY ? '✅ set' : '❌ missing',
      EVOLUTION_INSTANCE_NAME: process.env.EVOLUTION_INSTANCE_NAME || '❌ missing',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ set' : '❌ missing',
    }
  })
}
