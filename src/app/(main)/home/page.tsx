import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { ReportSheet } from '@/components/profile/ReportSheet'
import { HomeDmButton } from '@/components/home/HomeDmButton'
import { RefreshButton } from '@/components/home/RefreshButton'
import { DeletePostButton } from '@/components/post/DeletePostButton'
import type { Post, Profile, Gender } from '@/types'

/**
 * 홈 피드 화면 - 게시글 메인 피드이자 탐색 허브
 * 기준 문서: home-centered-ia-v0.1.md, home-centered-page-structure-v0.1.md
 *
 * 정렬: 최신순 | 최근 가입 [반대 성별] 보기
 * 필터: 전체보기/남성/여성, 성향
 */

const QUICK_ROLES = ['Dom', 'Sub', 'Switch'] as const

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; gender?: string; role?: string }>
}) {
  const supabase = await createServerClient()
  const { sort, gender, role } = await searchParams

  const activeSort = sort === 'new_members' ? 'new_members' : 'latest'
  const activeGender = gender === 'male' ? 'male' : gender === 'female' ? 'female' : null
  const activeRole = role ?? null

  // 현재 사용자 + 내 성별 조회
  const { data: { user } } = await supabase.auth.getUser()
  let myPoints: number | null = null
  let myGender: Gender | null = null

  if (user) {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('points, gender')
      .eq('id', user.id)
      .single()
    myPoints = myProfile?.points ?? null
    myGender = (myProfile?.gender as Gender) ?? null
  }

  // 반대 성별 결정 (미로그인 또는 기타이면 female 기본)
  const oppositeGender: Gender =
    myGender === 'female' ? 'male' : 'female'

  // ── 정렬 모드별 쿼리 ────────────────────────────────────────
  let posts: PostWithProfile[] = []

  if (activeSort === 'new_members') {
    // 최근 가입한 반대 성별 유저 ID 목록 (최대 60명)
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('gender', oppositeGender)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)

    const recentIds = (recentProfiles ?? []).map((p) => p.id)

    if (recentIds.length > 0) {
      const { data: rawPosts } = await supabase
        .from('posts')
        .select(`
          id, content, image_url, tags, is_auto_generated, created_at,
          profiles:user_id (id, nickname, gender, age_group, region, role)
        `)
        .eq('status', 'published')
        .in('user_id', recentIds)
        .order('created_at', { ascending: false })
        .limit(40)

      posts = (rawPosts ?? []) as unknown as PostWithProfile[]
    }
  } else {
    // 최신순 (기본)
    const { data: rawPosts } = await supabase
      .from('posts')
      .select(`
        id, content, image_url, tags, is_auto_generated, created_at,
        profiles:user_id (id, nickname, gender, age_group, region, role)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(40)

    posts = (rawPosts ?? []) as unknown as PostWithProfile[]
  }

  // 앱 레벨 필터 (성별, 성향) — new_members 탭에서도 추가 필터 가능
  if (activeGender) {
    posts = posts.filter((p) => p.profiles?.gender === activeGender)
  }
  if (activeRole) {
    posts = posts.filter((p) =>
      p.profiles?.role?.toLowerCase().includes(activeRole.toLowerCase())
    )
  }

  // 탭 레이블 (내 성별 기준 반대 성별)
  const newMembersLabel =
    myGender === 'female' ? '최근 가입 남성' : '최근 가입 여성'

  return (
    <div className="flex flex-col min-h-full">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 bg-bg-900/95 backdrop-blur-sm
                         border-b border-surface-700">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h1 className="text-text-strong text-lg font-semibold tracking-tight">
            욕망백서
          </h1>
          <div className="flex items-center gap-2">
            {myPoints !== null && (
              <Link
                href="/points"
                className="px-2.5 py-1 rounded-chip bg-surface-750 text-text-muted text-xs
                           border border-surface-700 tabular-nums"
              >
                {myPoints}P
              </Link>
            )}
            <RefreshButton />
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

        {/* 필터 바 */}
        <div className="px-4 pb-3 space-y-2">
          {/* 성별 필터 */}
          <div className="flex gap-1.5 items-center">
            <FilterChip
              href={buildUrl({ sort, gender: undefined, role })}
              active={activeGender === null}
            >
              전체보기
            </FilterChip>
            <FilterChip
              href={buildUrl({ sort, gender: gender === 'male' ? undefined : 'male', role })}
              active={activeGender === 'male'}
            >
              남성
            </FilterChip>
            <FilterChip
              href={buildUrl({ sort, gender: gender === 'female' ? undefined : 'female', role })}
              active={activeGender === 'female'}
            >
              여성
            </FilterChip>
          </div>

          {/* 성향 필터 */}
          <div className="flex gap-1.5 items-center">
            <span className="text-text-muted text-[11px] flex-shrink-0">성향</span>
            {QUICK_ROLES.map((r) => (
              <FilterChip
                key={r}
                href={buildUrl({ sort, gender, role: role === r ? undefined : r })}
                active={activeRole === r}
                variant="trust"
              >
                {r}
              </FilterChip>
            ))}
          </div>
        </div>
      </header>

      {/* 정렬 탭 - 피드 바로 위 */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1">
        <SortChip
          href={buildUrl({ sort: undefined, gender, role })}
          active={activeSort === 'latest'}
        >
          최신순
        </SortChip>
        <SortChip
          href={buildUrl({ sort: 'new_members', gender, role })}
          active={activeSort === 'new_members'}
        >
          {newMembersLabel}
        </SortChip>
      </div>

      {/* 피드 */}
      <div className="flex-1 px-4 py-3 space-y-3">
        {posts.length === 0 ? (
          <EmptyState sort={activeSort} label={newMembersLabel} />
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              userId={user?.id}
              myPoints={myPoints}
            />
          ))
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PostWithProfile = Post & {
  profiles: Pick<Profile, 'id' | 'nickname' | 'gender' | 'age_group' | 'region' | 'role'> | null
}

// ─────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────

function SortChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-chip text-xs font-semibold border transition-colors
                 ${active
                   ? 'bg-desire-500/15 text-desire-400 border-desire-500/30'
                   : 'bg-surface-750 text-text-muted border-surface-700'}`}
    >
      {children}
    </Link>
  )
}

function FilterChip({
  href,
  active,
  variant = 'primary',
  children,
}: {
  href: string
  active: boolean
  variant?: 'primary' | 'trust'
  children: React.ReactNode
}) {
  const activeClass =
    variant === 'trust'
      ? 'bg-trust-500/15 text-trust-400 border-trust-500/30'
      : 'bg-surface-700 text-text-secondary border-surface-600'

  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded-chip text-[11px] font-medium border transition-colors
                 ${active
                   ? activeClass
                   : 'bg-surface-750 text-text-muted border-surface-700'}`}
    >
      {children}
    </Link>
  )
}

function PostCard({
  post,
  userId,
  myPoints,
}: {
  post: PostWithProfile
  userId?: string
  myPoints: number | null
}) {
  const profile = post.profiles
  const timeAgo = formatTimeAgo(post.created_at)
  const roleLabel = profile?.role
    ? profile.role.split(/[,·\s·]+/)[0]?.trim() || null
    : null
  const tags = post.tags
    ? post.tags.split(/[,·\s·]+/).map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : []
  const isSelf = userId && profile?.id === userId
  const showDmButton = !isSelf && profile && myPoints !== null

  return (
    <article className="card relative">
      {/* 작성자 정보 - 클릭 → 프로필 */}
      <div className="flex items-start justify-between mb-3">
        <Link
          href={`/profile/${profile?.id}`}
          className="flex items-start gap-2.5 min-w-0 flex-1 active:opacity-70 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center
                          flex-shrink-0 text-text-muted text-sm font-medium">
            {profile?.nickname?.[0] ?? '?'}
          </div>
          <div className="min-w-0">
            {/* 닉네임 + 성별 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-text-strong font-medium text-sm">{profile?.nickname}</span>
              {profile?.gender && (
                <span className="text-text-muted text-[11px]">
                  {profile.gender === 'male' ? '남' : profile.gender === 'female' ? '여' : ''}
                </span>
              )}
            </div>
            {/* 나이대 · 지역 */}
            <p className="text-text-muted text-xs mt-0.5">
              {profile?.age_group} · {profile?.region}
            </p>
            {/* 성향 칩만 (태그는 하단 바로 이동) */}
            {roleLabel && (
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-chip text-[11px]
                               bg-surface-750 text-desire-400/80 border border-desire-500/25">
                {roleLabel}
              </span>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-1 flex-shrink-0 mt-1 ml-2">
          <span className="text-text-muted text-xs">{timeAgo}</span>
          {isSelf && <DeletePostButton postId={post.id} iconOnly />}
        </div>
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

      {/* 하단 바: 태그 | 액션 */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-surface-700/60">
        {/* 태그 (글 컨텍스트) - 왼쪽 */}
        {tags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-chip text-[11px]
                           bg-surface-750 text-text-muted border border-surface-700"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        {tags.length === 0 && <span className="flex-1" />}

        {/* 액션 - 오른쪽 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {showDmButton && (
            <HomeDmButton
              targetUserId={profile.id}
              targetNickname={profile.nickname}
              targetAgeGroup={profile.age_group ?? ''}
              targetRegion={profile.region ?? ''}
              targetRole={profile.role ?? null}
              myPoints={myPoints}
            />
          )}
          {profile && (
            <ReportSheet targetUserId={profile.id} targetNickname={profile.nickname} />
          )}
        </div>
      </div>
    </article>
  )
}

function EmptyState({ sort, label }: { sort: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">
        {sort === 'new_members'
          ? `최근 가입한 ${label.replace('최근 가입 ', '')} 유저의 글이 없습니다`
          : '조건에 맞는 글이 없습니다'}
      </p>
      <p className="text-text-muted text-sm">
        <Link href="/home" className="underline underline-offset-2">전체 글 보기</Link>
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function buildUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v)
  }
  const qs = sp.toString()
  return `/home${qs ? `?${qs}` : ''}`
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
