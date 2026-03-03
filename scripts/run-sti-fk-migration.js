/**
 * STI reviewer_id / actor_id FK 마이그레이션 실행
 *
 * 1) Supabase 대시보드 > Project Settings > Database > Connection string (URI) 복사
 * 2) 프로젝트 루트 .env.local 에 한 줄 추가: DATABASE_URL="postgresql://postgres.[ref]:[YOUR-PASSWORD]@..."
 * 3) 프로젝트 루트에서 실행: node scripts/run-sti-fk-migration.js
 *
 * 또는 한 번만: set DATABASE_URL=postgresql://... && node scripts/run-sti-fk-migration.js
 */
const { readFileSync } = require('fs')
const { join } = require('path')
const { Client } = require('pg')

function loadEnvLocal() {
  try {
    const path = join(process.cwd(), '.env.local')
    const content = readFileSync(path, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([^#=]+)=(.*)$/)
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch (_) {}
}

loadEnvLocal()
const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('DATABASE_URL 또는 SUPABASE_DB_URL이 필요합니다. .env.local에 넣거나 환경변수로 전달하세요.')
  process.exit(1)
}

const sqlPath = join(process.cwd(), 'supabase', 'migrations', '202603060001_fix_sti_reviewer_fk_to_auth_users.sql')
const sql = readFileSync(sqlPath, 'utf8').replace(/--[^\n]*/g, '').trim()

async function main() {
  const client = new Client({ connectionString: dbUrl })
  try {
    await client.connect()
    await client.query(sql)
    console.log('마이그레이션 적용 완료.')
  } catch (e) {
    console.error('실패:', e.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

main()
