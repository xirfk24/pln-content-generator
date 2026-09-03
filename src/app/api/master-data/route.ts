import { NextResponse } from 'next/server'
import { getMasterData } from '@/services/content'

export async function GET() {
  const masterData = await getMasterData()
  
  return NextResponse.json(masterData)
}
