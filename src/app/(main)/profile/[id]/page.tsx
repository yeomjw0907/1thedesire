import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { DmRequestSheet } from '@/components/profile/DmRequestSheet'
import { ReportSheet } from '@/components/profile/ReportSheet'
import { BlockSheet } from '@/components/profile/BlockSheet'
import { StiVerificationBadge } from '@/components/sti/StiVerificationBadge'
import type { PublicStiBadge } from '@/types/sti'

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) notFound()

  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, image_url, tags, created_at')
    .eq('user_id', id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(5)

  const isSelf = user.id === id

  let isBlocked = false
  let myPoints = 0

  if (!isSelf) {
    const [{ data: block }, { data: myProfile }] = await Promise.all([
      supabase
        .from('blocks')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', id)
        .maybeSingle(),
      supabase.from('profiles').select('points').eq('id', user.id).single(),
    ])
    isBlocked = !!block
    myPoints = myProfile?.points ?? 0
  }

  const { data: stiBadgeRow } = await supabase
    .from('public_sti_badges')
    .select('user_id, test_date, expires_at, verified_at')
    .eq('user_id', id)
    .maybeSingle()

  const publicStiBadge = stiBadgeRow as PublicStiBadge | null

  // 성향 태그 파싱
  const roleTags = profile.role
    ? profile.role.split(/[,·\s·]+/).map((t: string) => t.trim()).filter(Boolean)
    : []

  return (
    <div className="flex flex-col min-h-full pb-36">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between
                         px-2 py-2 bg-bg-900/95 backdrop-blur-sm border-b border-surface-700/30">
        <Link
          href="/home"
          className="p-2 text-text-secondary active:text-text-primary transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>

        {!isSelf && (
          <div className="flex items-center gap-1">
            <ReportSheet targetUserId={id} targetNickname={profile.nickname} />
            <BlockSheet targetUserId={id} targetNickname={profile.nickname} isBlocked={isBlocked} />
          </div>
        )}
        {/* 편집 버튼은 닉네임 옆으로 이동 */}
      </header>

      {/* 프로필 헤더 - 아바타 + 기본 정보 */}
      <section className="px-6 pt-6 pb-5 border-b border-surface-700/40">
        <div className="flex items-start gap-4 mb-4">
          {/* 아바타 */}
          <div className="w-16 h-16 rounded-full bg-surface-700 flex items-center justify-center
                          flex-shrink-0 text-2xl font-semibold text-text-muted border border-surface-600 overflow-hidden">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
            ) : (
              <span>{profile.nickname?.[0] ?? '?'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-baseline justify-between mb-1">
              <h1 className="text-text-strong text-[22px] font-semibold leading-tight">
                {profile.nickname}
              </h1>
              {isSelf && (
                <Link
                  href="/profile/edit"
                  className="text-text-muted text-sm active:text-text-secondary transition-colors flex-shrink-0"
                >
                  편집
                </Link>
              )}
            </div>
            <p className="text-text-secondary text-sm">
              {profile.age_group} · {profile.region} · {genderLabel(profile.gender)}
            </p>
          </div>
        </div>

        {/* 성향 태그 */}
        {roleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {roleTags.map((tag: string) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-chip text-xs
                           bg-surface-750 text-text-secondary border border-surface-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 신뢰 정보 섹션 */}
      <section className="px-6 py-4 border-b border-surface-700/40">
        <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase mb-3">
          신뢰 정보
        </h2>
        <div className="space-y-2.5">
          {/* 최근검사 확인 배지 */}
          {publicStiBadge ? (
            <StiVerificationBadge badge={publicStiBadge} />
          ) : (
            <p className="text-text-muted text-xs">최근검사 확인 정보 없음</p>
          )}

          {/* 최근 활동 */}
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-state-success inline-block" />
            <span className="text-text-muted text-xs">
              최근 활동: {getLastActive(profile.updated_at)}
            </span>
          </div>

          {/* 여성 메리트 */}
          {profile.gender === 'female' && (
            <div className="flex items-center gap-1.5">
              <span className="text-trust-400 text-xs">받은 요청 수락 무료</span>
            </div>
          )}
        </div>
      </section>

      {/* 자기소개 */}
      {profile.bio && (
        <section className="px-6 py-5 border-b border-surface-700/40">
          <h2 className="text-text-muted text-[11px] font-medium mb-3
                         tracking-widest uppercase">
            소개
          </h2>
          <p className="text-text-primary text-[15px] leading-7 whitespace-pre-wrap">
            {profile.bio}
          </p>
        </section>
      )}

      {/* 최근 분위기 - 본인/상대 모두 표시, 홈→프로필→DM 판단 흐름 지원 */}
      {posts && posts.length > 0 && (
        <section className="px-6 py-5">
          <h2 className="text-text-muted text-[11px] font-medium mb-3
                         tracking-widest uppercase">
            {isSelf ? '내 글' : '최근 글'}
          </h2>
          <div className="space-y-3">
            {posts.map((post) => {
              const postTags: string[] = post.tags
                ? (post.tags as string).split(/[,·\s·]+/).map((t: string) => t.trim()).filter(Boolean)
                : []
              return (
                <div key={post.id} className="card">
                  {post.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.image_url}
                      alt=""
                      className="w-full max-h-40 object-cover rounded-xl mb-3 opacity-80"
                    />
                  )}
                  {postTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {postTags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-chip text-[11px]
                                     bg-surface-750 text-text-muted border border-surface-700"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-text-primary text-sm leading-relaxed line-clamp-4">
                    {post.content}
                  </p>
                  <p className="text-text-muted text-xs mt-2">
                    {formatTimeAgo(post.created_at)}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Sticky CTA */}
      {!isSelf && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
          {isBlocked ? (
            <div className="w-full py-4 rounded-chip bg-surface-750 border border-surface-700
                            text-center text-text-muted font-medium text-sm">
              차단한 사용자입니다
            </div>
          ) : (
            <DmRequestSheet
              targetUserId={id}
              targetProfile={profile}
              myPoints={myPoints}
            />
          )}
        </div>
      )}

      {isSelf && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40">
          <Link
            href="/post/write"
            className="flex items-center justify-center w-full py-4 rounded-chip
                       bg-desire-500/15 text-desire-400 font-semibold
                       active:bg-desire-500/25 transition-colors"
          >
            글 작성하기
          </Link>
        </div>
      )}
    </div>
  )
}

function genderLabel(gender: string): string {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '기타'
}

function getLastActive(updatedAt: string): string {
  const diffDays = Math.floor(
    (Date.now() - new Date(updatedAt).getTime()) / 86400000
  )
  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '어제'
  if (diffDays < 7) return `${diffDays}일 전`
  return `${Math.floor(diffDays / 7)}주 전`
}

function formatTimeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return '방금'
  if (diffMins < 60) return `${diffMins}분 전`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}시간 전`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}일 전`
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  })
}
