import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET() {
  const filePath = path.join(process.cwd(), 'docs', 'legal', 'terms-of-service-v0.1.md')
  const content = fs.readFileSync(filePath, 'utf-8')
  return NextResponse.json({ content })
}
