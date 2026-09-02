import { NextRequest, NextResponse } from 'next/server'
import { getContentsForCalendar } from '@/services/content'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  
  const filters = {
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  }
  
  const contents = await getContentsForCalendar(filters)
  
  return NextResponse.json({ contents })
}
