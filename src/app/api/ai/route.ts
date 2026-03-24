import { NextResponse } from 'next/server'

// ai-router package not installed — stub route
export async function POST() {
  return NextResponse.json({ error: 'AI router not configured' }, { status: 501 })
}

export async function GET() {
  return NextResponse.json({ status: 'ai-router not configured' })
}
