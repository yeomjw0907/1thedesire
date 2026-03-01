import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { DmRequestSheet } from '@/components/profile/DmRequestSheet'
import { ReportSheet } from '@/components/profile/ReportSheet'
import { BlockSheet } from '@/components/profile/BlockSheet'

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 프로필 조회
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !profile) notFound()

  // 최근 게시글 (최신 5개)
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

  return (
    <div className="flex flex-col min-h-full pb-36">
      {/* 상단 바 */}
      <header className="sticky top-0 z-10 flex items-center justify-between
                         px-2 py-2 bg-bg-900/95 backdrop-blur-sm">
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
        {isSelf && (
          <span className="text-text-muted text-xs pr-3">내 프로필</span>
        )}
      </header>

      {/* 프로필 헤더 */}
      <section className="px-6 pt-5 pb-6 border-b border-surface-700/40">
        <h1 className="text-text-strong text-[26px] font-semibold mb-2 leading-tight">
          {profile.nickname}
        </h1>
        <p className="text-text-secondary text-sm mb-3">
          {profile.age_group} · {profile.region} · {genderLabel(profile.gender)}
        </p>
        {profile.role && (
          <div className="flex flex-wrap gap-1.5">
            <span className="px-2.5 py-0.5 rounded-chip text-xs
                           bg-surface-750 text-text-secondary border border-surface-700">
              {profile.role.split(/[,·\s·]+/)[0]?.trim() ?? profile.role}
            </span>
          </div>
        )}
      </section>

      {/* 상태 라인 */}
      <section className="px-6 py-4 border-b border-surface-700/40">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-state-success inline-block" />
            <span className="text-text-muted text-xs">
              최근 활동: {getLastActive(profile.updated_at)}
            </span>
          </div>
          {profile.gender === 'female' && (
            <span className="text-trust-400 text-xs">받은 요청 수락 무료</span>
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

      {/* 최근 분위기 */}
      {posts && posts.length > 0 && (
        <section className="px-6 py-5">
          <h2 className="text-text-muted text-[11px] font-medium mb-3
                         tracking-widest uppercase">
            최근 분위기
          </h2>
          <div className="space-y-3">
            {posts.map((post) => {
              const postTags = post.tags
                ? post.tags.split(/[,·\s·]+/).map((t) => t.trim()).filter(Boolean)
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
                      {postTags.map((tag) => (
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

      {/* 게시글 없음 */}
      {(!posts || posts.length === 0) && (
        <div className="px-6 py-8 text-center">
          <p className="text-text-muted text-sm">아직 남긴 분위기가 없습니다</p>
        </div>
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
            분위기 남기기
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
