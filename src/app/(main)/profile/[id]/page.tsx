import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { DmRequestSheet } from '@/components/profile/DmRequestSheet'
import { ReportSheet } from '@/components/profile/ReportSheet'
import { BlockSheet } from '@/components/profile/BlockSheet'
import { StiVerificationBadge } from '@/components/sti/StiVerificationBadge'
import { PostImageViewer } from '@/components/post/PostImageViewer'
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
      </header>

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-6 pt-10 pb-7">
        {/* 아바타 */}
        <div className="w-24 h-24 rounded-full bg-surface-700 border-2 border-surface-600
                        flex items-center justify-center overflow-hidden
                        text-3xl font-bold text-text-muted mb-4 flex-shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
          ) : (
            <span>{profile.nickname?.[0] ?? '?'}</span>
          )}
        </div>

        {/* 닉네임 */}
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className="text-text-strong text-2xl font-bold tracking-tight">
            {profile.nickname}
          </h1>
          {isSelf && (
            <Link
              href="/profile/edit"
              className="text-text-muted text-xs border border-surface-700 rounded-chip px-2.5 py-1
                         active:bg-surface-750 transition-colors"
            >
              편집
            </Link>
          )}
        </div>

        {/* 나이 · 지역 · 성별 */}
        <p className="text-text-secondary text-sm mb-1">
          {profile.age_group} · {profile.region} · {genderLabel(profile.gender)}
        </p>

        {/* 가입일 */}
        <p className="text-text-muted text-[11px] mb-4">
          {new Date(profile.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric',
          })} 가입
        </p>

        {/* 역할 칩 — 컬러 테마 */}
        {roleTags.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {roleTags.map((tag: string) => {
              const t = tag.toLowerCase()
              const cls =
                t === 'dom'
                  ? 'bg-desire-500/10 text-desire-400 border-desire-500/30'
                  : t === 'sub'
                  ? 'bg-trust-500/10 text-trust-400 border-trust-500/30'
                  : 'bg-surface-750 text-text-secondary border-surface-600'
              return (
                <span key={tag}
                  className={`px-3 py-1 rounded-chip text-xs font-medium border ${cls}`}>
                  {tag}
                </span>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 활동 + 신뢰 — 가로 인라인 카드 ── */}
      <div className="px-4 mb-3">
        <div className="bg-surface-800 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
          {/* 최근 활동 */}
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-state-success flex-shrink-0" />
            <span className="text-text-muted text-xs">{getLastActive(profile.updated_at)}</span>
          </div>

          {/* 구분점 */}
          {publicStiBadge && (
            <span className="text-surface-600 text-xs select-none">·</span>
          )}

          {/* STI 배지 */}
          {publicStiBadge && <StiVerificationBadge badge={publicStiBadge} />}

          {/* 여성 DM 무료 */}
          {profile.gender === 'female' && (
            <>
              <span className="text-surface-600 text-xs select-none">·</span>
              <span className="text-trust-400 text-xs">DM 수락 무료</span>
            </>
          )}
        </div>
      </div>

      {/* ── 자기소개 ── */}
      {profile.bio && (
        <div className="px-4 mb-3">
          <div className="bg-surface-800 rounded-2xl px-4 py-4">
            <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest mb-2.5">
              소개
            </p>
            <p className="text-text-primary text-[14px] leading-7 whitespace-pre-wrap">
              {profile.bio}
            </p>
          </div>
        </div>
      )}

      {/* ── 최근 글 ── */}
      {posts && posts.length > 0 && (
        <div className="px-4 mb-3">
          <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest px-1 mb-3">
            {isSelf ? '내 글' : '최근 글'}
          </p>
          <div className="space-y-2.5">
            {posts.map((post) => {
              const postTags: string[] = post.tags
                ? (post.tags as string).split(/[,·\s·]+/).map((t: string) => t.trim()).filter(Boolean)
                : []
              return (
                <div key={post.id} className="bg-surface-800 rounded-2xl p-4">
                  {post.image_url && (
                    <PostImageViewer src={post.image_url} />
                  )}
                  <p className="text-text-primary text-[14px] leading-[1.75] line-clamp-4 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {postTags.map((tag: string) => (
                        <span key={tag}
                          className="px-2 py-0.5 rounded-chip text-[10px]
                                     bg-surface-750 text-text-muted border border-surface-700/70">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <span className="text-text-muted text-[11px] flex-shrink-0 ml-2">
                      {formatTimeAgo(post.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Sticky CTA ── */}
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
