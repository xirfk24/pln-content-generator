import { NextResponse } from 'next/server'
import { getMasterData } from '@/services/content'
import { getPillars } from '@/services/content-ideas'

export async function GET() {
  const masterData = await getMasterData()
  const pillars = await getPillars()
  
  return NextResponse.json({
    ...masterData,
    pillars: pillars.length > 0 ? pillars : masterData.pillars,
  })
}
