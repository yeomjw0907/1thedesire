import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ReportSheet } from '@/components/profile/ReportSheet'
import type { Post, Profile } from '@/types'

/**
 * 홈 피드 화면
 * 기준 문서: wireframes-v0.1.md §3, hifi-ui-spec-v0.1.md §3, wire-copy-v0.1.md §2
 *
 * 탭: 전체 / 신규 (7일 이내 가입 유저 게시글)
 * 게시글 카드: 작성자 메타 + 본문 + 이미지(선택) + 액션
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createServerClient()
  const { tab } = await searchParams
  const activeTab = tab === 'new' ? 'new' : 'all'

  // 현재 사용자 포인트 표시용
  const { data: { user } } = await supabase.auth.getUser()
  let myPoints: number | null = null
  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', user.id)
      .single()
    myPoints = myProfile?.points ?? null
  }

  // published 게시글 + 작성자 프로필
  // 신규 탭: 7일 이내 가입 유저의 게시글
  const query = supabase
    .from('posts')
    .select(`
      id,
      content,
      image_url,
      tags,
      is_auto_generated,
      created_at,
      profiles:user_id (
        id,
        nickname,
        gender,
        age_group,
        region,
        role
      )
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(30)

  if (activeTab === 'new') {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    query.gte('created_at', sevenDaysAgo.toISOString())
  }

  const { data: posts } = await query

  return (
    <div className="flex flex-col min-h-full">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-10 bg-bg-900/95 backdrop-blur-sm
                         border-b border-surface-700 px-5 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-text-strong text-lg font-semibold tracking-tight">
            욕망백서
          </h1>
          <div className="flex items-center gap-2">
            {myPoints !== null && (
              <span
                className="px-2.5 py-1 rounded-chip bg-surface-750 text-text-muted text-xs
                           border border-surface-700 tabular-nums"
                style={{ fontFamily: 'Montserrat, monospace' }}
              >
                {myPoints}P
              </span>
            )}
            <Link
              href="/post/write"
              className="flex items-center gap-1 px-3 py-1.5 rounded-chip
                         bg-desire-500/15 text-desire-400 text-sm font-medium
                         active:bg-desire-500/25 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              글쓰기
            </Link>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1">
          <Link
            href="/home"
            className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors duration-150
                       ${activeTab === 'all'
                         ? 'bg-desire-500/15 text-desire-400'
                         : 'text-text-muted'}`}
          >
            전체
          </Link>
          <Link
            href="/home?tab=new"
            className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors duration-150
                       ${activeTab === 'new'
                         ? 'bg-desire-500/15 text-desire-400'
                         : 'text-text-muted'}`}
          >
            신규
          </Link>
        </div>
      </header>

      {/* Hero Strip */}
      <div className="px-5 py-3 border-b border-surface-700/30">
        <p className="text-text-muted text-xs">글과 분위기로 먼저 사람을 읽어보세요</p>
      </div>

      {/* 피드 */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {!posts || posts.length === 0 ? (
          <EmptyState activeTab={activeTab} />
        ) : (
          posts.map((post) => (
            <PostCard key={post.id} post={post as unknown as PostWithProfile} />
          ))
        )}
      </div>
    </div>
  )
}

type PostWithProfile = Post & {
  profiles: Pick<Profile, 'id' | 'nickname' | 'gender' | 'age_group' | 'region' | 'role'>
}

function roleChip(role: string | null): string | null {
  if (!role) return null
  const first = role.split(/[,·\s·]+/)[0]?.trim()
  return first || null
}

function postTagsList(tags: string | null): string[] {
  if (!tags) return []
  return tags.split(/[,·\s·]+/).map((t) => t.trim()).filter(Boolean).slice(0, 3)
}

function PostCard({ post }: { post: PostWithProfile }) {
  const profile = post.profiles
  const timeAgo = formatTimeAgo(post.created_at)
  const roleLabel = roleChip(profile.role)
  const tags = postTagsList(post.tags ?? null)

  return (
    <article className="card">
      {/* 작성자 정보 */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-text-strong font-medium text-sm">{profile.nickname}</p>
            {roleLabel && (
              <span className="px-2 py-0.5 rounded-chip text-[11px]
                             bg-surface-750 text-text-muted border border-surface-700">
                {roleLabel}
              </span>
            )}
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-chip text-[11px]
                           bg-surface-750 text-text-muted border border-surface-700"
              >
                {tag}
              </span>
            ))}
          </div>
          <p className="text-text-muted text-xs mt-0.5">
            {profile.age_group} · {profile.region}
          </p>
        </div>
        <span className="text-text-muted text-xs flex-shrink-0 ml-3 mt-0.5">{timeAgo}</span>
      </div>

      {/* 본문 */}
      <p className="text-text-primary text-[14px] leading-6 whitespace-pre-wrap line-clamp-5">
        {post.content}
      </p>

      {/* 이미지 */}
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt=""
          className="w-full max-h-52 object-cover rounded-xl mt-3 opacity-80"
        />
      )}

      {/* 액션 */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-surface-700/60">
        <Link
          href={`/profile/${profile.id}`}
          className="text-text-muted text-xs active:text-text-secondary transition-colors"
        >
          프로필 보기
        </Link>
        <span className="text-surface-700 text-xs select-none">·</span>
        <ReportSheet targetUserId={profile.id} targetNickname={profile.nickname} />
      </div>
    </article>
  )
}

function EmptyState({ activeTab }: { activeTab: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">
        {activeTab === 'new' ? '신규 분위기가 아직 없습니다' : '아직 올라온 글이 없습니다'}
      </p>
      <p className="text-text-muted text-sm">
        {activeTab === 'new' ? '전체 탭에서 더 많은 글을 만나보세요' : '첫 분위기를 남겨보세요'}
      </p>
    </div>
  )
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
  return new Date(dateString).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}
