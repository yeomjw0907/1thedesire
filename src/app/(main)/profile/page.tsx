import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getMyVerificationStatus } from '@/lib/actions/sti'
import { StiVerificationBadge } from '@/components/sti/StiVerificationBadge'
import { MyPostsSection } from '@/components/profile/MyPostsSection'
import { AvatarUploadButton } from '@/components/profile/AvatarUploadButton'
import { LogoutButton } from '@/components/profile/LogoutButton'
import { WithdrawButton } from '@/components/profile/WithdrawButton'
import type { PublicStiBadge } from '@/types/sti'
import type { MyPostRow } from '@/lib/actions/posts'

const MENU_ROW_CLASS =
  'w-full flex items-center justify-between py-3 px-4 text-left text-text-primary text-sm active:bg-surface-750/50 transition-colors rounded-xl'

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

export default async function MyProfilePage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [profileRes, postsRes, stiBadgeRes, stiStatus] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('posts')
      .select('id, content, image_url, image_url_2, like_count, created_at')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(7),
    supabase
      .from('public_sti_badges')
      .select('user_id, test_date, expires_at, verified_at')
      .eq('user_id', user.id)
      .maybeSingle(),
    getMyVerificationStatus(),
  ])

  const profile = profileRes.data
  if (!profile) redirect('/signup')

  if (postsRes.error) {
    console.error('[profile] posts fetch error:', postsRes.error)
  }
  const postsRaw = postsRes.data ?? []
  const postsLoadError = !!postsRes.error
  const initialPosts = postsRaw.slice(0, 6) as MyPostRow[]
  const hasMoreInitially = postsRaw.length > 6
  const stiBadgeRow = stiBadgeRes.data

  const publicStiBadge = stiBadgeRow as PublicStiBadge | null
  const stiReviewing = stiStatus === 'pending' || stiStatus === 'under_review'

  const roleTags = profile.role
    ? profile.role.split(/\s*·\s*/).map((t: string) => t.trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* 프로필 헤더 — 아바타 + 이름·메타 한 블록, 편집 칩 */}
      <header className="px-5 pt-6 pb-5">
        <div className="flex items-start gap-4">
          <AvatarUploadButton
            userId={user.id}
            nickname={profile.nickname}
            currentAvatarUrl={profile.avatar_url}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-text-strong text-xl font-semibold tracking-tight">
                {profile.nickname}
              </h1>
              <Link
                href="/profile/edit"
                className="rounded-chip px-2.5 py-1 text-xs font-medium
                           bg-surface-750 text-text-secondary border border-surface-700
                           active:bg-surface-700 transition-colors"
              >
                편집
              </Link>
            </div>
            <p className="text-text-muted text-sm mt-1">
              {profile.age_group} · {profile.region} · {genderLabel(profile.gender)}
            </p>
            {roleTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {roleTags.map((tag: string) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-chip text-[11px] font-medium
                               bg-surface-750 text-text-muted border border-surface-700/70"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 신뢰 정보 — 카드 하나로 */}
      <section className="px-4 mb-3">
        <div className="bg-surface-800 rounded-2xl px-4 py-4">
          <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-3">
            신뢰 정보
          </p>
          {publicStiBadge ? (
            <StiVerificationBadge badge={publicStiBadge} />
          ) : stiReviewing ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-state-warning animate-pulse" />
                <span className="text-state-warning text-xs font-medium">심사 중</span>
              </div>
              <Link href="/profile/verification" className="text-text-muted text-xs active:opacity-70">
                상태 보기
              </Link>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-text-muted text-xs">최근검사 확인 정보 없음</p>
              <Link href="/profile/verification" className="text-desire-400 text-xs active:opacity-70">
                제출하기
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* 자기소개 — 카드 */}
      {profile.bio && (
        <section className="px-4 mb-3">
          <div className="bg-surface-800 rounded-2xl px-4 py-4">
            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-2.5">
              자기소개
            </p>
            <p className="text-text-primary text-[14px] leading-7 whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        </section>
      )}

      {postsLoadError && (
        <p className="px-4 mb-2 text-state-danger text-xs">
          내 글이 일시적으로 로드되지 않았습니다.
        </p>
      )}
      <MyPostsSection initialPosts={initialPosts} hasMoreInitially={hasMoreInitially} />

      {/* 운영 메뉴 — 리스트 카드 */}
      <section className="px-4 pb-8">
        <div className="bg-surface-800 rounded-2xl overflow-hidden divide-y divide-surface-700/50">
          <Link href="/profile/notifications" className={`block ${MENU_ROW_CLASS}`}>
            <span>알림</span>
            <ChevronRight />
          </Link>
          <Link href="/profile/blocks" className={`block ${MENU_ROW_CLASS}`}>
            <span>차단한 사용자</span>
            <ChevronRight />
          </Link>
          <a href="https://open.kakao.com/o/sdJmvtji" target="_blank" rel="noopener noreferrer" className={`block ${MENU_ROW_CLASS}`}>
            <span>오픈카톡으로 문의하기</span>
            <ChevronRight />
          </a>
          <Link href="/legal/terms" className={`block ${MENU_ROW_CLASS}`}>
            <span>이용약관</span>
            <ChevronRight />
          </Link>
          <Link href="/legal/privacy" className={`block ${MENU_ROW_CLASS}`}>
            <span>개인정보처리방침</span>
            <ChevronRight />
          </Link>
          <LogoutButton />
        </div>
        <div className="mt-3">
          <div className="bg-surface-800 rounded-2xl overflow-hidden">
            <WithdrawButton />
          </div>
        </div>
      </section>
    </div>
  )
}

function genderLabel(gender: string): string {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '기타'
}

