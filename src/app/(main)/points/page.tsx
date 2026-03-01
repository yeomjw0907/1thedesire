import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ChargeSheet } from '@/components/points/ChargeSheet'
import type { PointTransaction } from '@/types'

/**
 * 포인트 내역 + 충전 화면
 * 기준 문서: wireframes-v0.1.md §6, point-monetization-ux-v0.1.md
 */
export default async function PointsPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', user.id)
    .single()

  const { data: transactions } = await supabase
    .from('point_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* 헤더 */}
      <header className="px-5 pt-6 pb-5 border-b border-surface-700/40">
        <h1 className="text-text-strong text-lg font-semibold tracking-tight mb-4">
          포인트
        </h1>

        {/* 잔액 카드 */}
        <div className="bg-surface-800 rounded-card p-5 border border-surface-700/50">
          <p className="text-text-muted text-xs mb-2">보유 포인트</p>
          <p
            className="text-text-strong text-4xl font-bold tabular-nums"
            style={{ fontFamily: 'Montserrat, monospace' }}
          >
            {profile?.points ?? 0}
            <span className="text-text-muted text-xl font-normal ml-1">P</span>
          </p>
          <p className="text-text-muted text-xs mt-3">
            DM 요청 1회 90P · 거절 시 45P 환불 · 미응답 시 전액 환불
          </p>
        </div>

        {/* 충전 버튼 */}
        <ChargeSheet />
      </header>

      {/* 내역 */}
      <section className="px-4 pt-5">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase px-2 mb-4">
          내역
        </h2>

        {!transactions || transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted text-sm">포인트 내역이 없습니다</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx as PointTransaction} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function TransactionRow({ tx }: { tx: PointTransaction }) {
  const isCredit = tx.amount > 0
  const amountStr = isCredit ? `+${tx.amount}P` : `${tx.amount}P`
  const amountColor = isCredit ? 'text-trust-400' : 'text-text-secondary'

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-text-primary text-sm">{tx.description ?? labelFromType(tx.type)}</p>
        <p className="text-text-muted text-xs mt-0.5">{formatDate(tx.created_at)}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p
          className={`font-semibold text-sm tabular-nums ${amountColor}`}
          style={{ fontFamily: 'Montserrat, monospace' }}
        >
          {amountStr}
        </p>
        <p
          className="text-text-muted text-[10px] tabular-nums mt-0.5"
          style={{ fontFamily: 'Montserrat, monospace' }}
        >
          잔액 {tx.balance_after}P
        </p>
      </div>
    </div>
  )
}

function labelFromType(type: string): string {
  const labels: Record<string, string> = {
    signup_bonus: '가입 보너스',
    charge: '포인트 충전',
    debit: '포인트 사용',
    refund: '포인트 환불',
    manual_adjustment: '수동 조정',
  }
  return labels[type] ?? '포인트 변동'
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
