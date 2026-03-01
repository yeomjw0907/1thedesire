import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'legal', 'terms-of-service-v0.1.md')
    const content = fs.readFileSync(filePath, 'utf-8')
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json(
      { error: '이용약관 파일을 찾을 수 없습니다.' },
      { status: 500 }
    )
  }
}
