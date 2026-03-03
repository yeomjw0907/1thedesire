import nextDynamic from 'next/dynamic'
import Link from 'next/link'
import { createServerClient } from '@/lib/supabase/server'
import { HomeDmButton } from '@/components/home/HomeDmButton'
import { DeletePostButton } from '@/components/post/DeletePostButton'
import { REGIONS, AGE_BAND_TO_GROUPS } from '@/lib/constants/signup'
import { PullToRefresh } from '@/components/home/PullToRefresh'
import { LikeButton } from '@/components/post/LikeButton'
import { PostImageViewer } from '@/components/post/PostImageViewer'
import { NotificationBell } from '@/components/layout/NotificationBell'
import type { Post, Profile, Gender } from '@/types'

const ReportSheet = nextDynamic(
  () => import('@/components/profile/ReportSheet').then((m) => ({ default: m.ReportSheet }))
)
const HomeAdvancedFilter = nextDynamic(
  () => import('@/components/home/HomeAdvancedFilter').then((m) => ({ default: m.HomeAdvancedFilter }))
)

/**
 * 홈 피드 화면 - 게시글 메인 피드이자 탐색 허브
 * 기준 문서: home-centered-ia-v0.1.md, home-centered-page-structure-v0.1.md
 *
 * 정렬: 최신순 | 최근 가입 [반대 성별] 보기
 * 필터: 전체보기/남성/여성, 성향, 지역, 나이대
 */
export const dynamic = 'force-dynamic'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; gender?: string; role?: string; region?: string; age_band?: string | string[] }>
}) {
  const supabase = await createServerClient()
  const params = await searchParams
  const { sort, gender, role, region, age_band } = params

  const activeSort = sort === 'new_members' ? 'new_members' : 'latest'
  const activeGender = gender === 'male' ? 'male' : gender === 'female' ? 'female' : null
  const activeRole = role ?? null
  const activeRegion = region && (REGIONS as readonly string[]).includes(region) ? region : null
  const activeAgeBands = (Array.isArray(age_band) ? age_band : age_band ? [age_band] : []).filter(
    (b) => b && b in AGE_BAND_TO_GROUPS
  )

  const { data: { user } } = await supabase.auth.getUser()
  let myPoints: number | null = null
  let myGender: Gender | null = null
  let posts: PostWithProfile[] = []
  let feedError = false

  if (user && activeSort === 'latest') {
    const [myProfileRes, rawPostsRes] = await Promise.all([
      supabase.from('profiles').select('points, gender').eq('id', user.id).single(),
      supabase
        .from('posts')
        .select(`
          id, content, image_url, image_url_2, tags, like_count, is_auto_generated, created_at,
          profiles:user_id (id, nickname, gender, age_group, region, role, withdrawn_at)
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(40),
    ])
    myPoints = myProfileRes.data?.points ?? null
    myGender = (myProfileRes.data?.gender as Gender) ?? null
    if (rawPostsRes.error) {
      console.error('[home] posts fetch error:', rawPostsRes.error)
      feedError = true
    }
    posts = (rawPostsRes.data ?? []) as unknown as PostWithProfile[]
  } else if (user && activeSort === 'new_members') {
    const { data: myProfile } = await supabase
      .from('profiles')
      .select('points, gender')
      .eq('id', user.id)
      .single()
    myPoints = myProfile?.points ?? null
    myGender = (myProfile?.gender as Gender) ?? null
    const oppositeGender: Gender = myGender === 'female' ? 'male' : 'female'
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('gender', oppositeGender)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)
    const recentIds = (recentProfiles ?? []).map((p) => p.id)
    if (recentIds.length > 0) {
      const rawPostsRes = await supabase
        .from('posts')
        .select(`
          id, content, image_url, image_url_2, tags, like_count, is_auto_generated, created_at,
          profiles:user_id (id, nickname, gender, age_group, region, role, withdrawn_at)
        `)
        .eq('status', 'published')
        .in('user_id', recentIds)
        .order('created_at', { ascending: false })
        .limit(40)
      if (rawPostsRes.error) {
        console.error('[home] posts fetch error (new_members):', rawPostsRes.error)
        feedError = true
      }
      posts = (rawPostsRes.data ?? []) as unknown as PostWithProfile[]
    }
  } else if (activeSort === 'new_members') {
    const oppositeGender: Gender = 'female'
    const { data: recentProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('gender', oppositeGender)
      .eq('account_status', 'active')
      .order('created_at', { ascending: false })
      .limit(60)
    const recentIds = (recentProfiles ?? []).map((p) => p.id)
    if (recentIds.length > 0) {
      const rawPostsRes = await supabase
        .from('posts')
        .select(`
          id, content, image_url, image_url_2, tags, like_count, is_auto_generated, created_at,
          profiles:user_id (id, nickname, gender, age_group, region, role, withdrawn_at)
        `)
        .eq('status', 'published')
        .in('user_id', recentIds)
        .order('created_at', { ascending: false })
        .limit(40)
      if (rawPostsRes.error) {
        console.error('[home] posts fetch error (new_members guest):', rawPostsRes.error)
        feedError = true
      }
      posts = (rawPostsRes.data ?? []) as unknown as PostWithProfile[]
    }
  } else {
    const rawPostsRes = await supabase
      .from('posts')
      .select(`
        id, content, image_url, image_url_2, tags, like_count, is_auto_generated, created_at,
        profiles:user_id (id, nickname, gender, age_group, region, role, withdrawn_at)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(40)
    if (rawPostsRes.error) {
      console.error('[home] posts fetch error (latest guest):', rawPostsRes.error)
      feedError = true
    }
    posts = (rawPostsRes.data ?? []) as unknown as PostWithProfile[]
  }

  const oppositeGender: Gender = myGender === 'female' ? 'male' : 'female'

  // 앱 레벨 필터 (성별, 성향, 지역, 나이대) — new_members 탭에서도 추가 필터 가능
  if (activeGender) {
    posts = posts.filter((p) => p.profiles?.gender === activeGender)
  }
  if (activeRole) {
    posts = posts.filter((p) =>
      p.profiles?.role?.toLowerCase().includes(activeRole.toLowerCase())
    )
  }
  if (activeRegion) {
    posts = posts.filter((p) => p.profiles?.region === activeRegion)
  }
  if (activeAgeBands.length > 0) {
    const allowedGroups = new Set(
      activeAgeBands.flatMap((band) => AGE_BAND_TO_GROUPS[band])
    )
    posts = posts.filter((p) => p.profiles?.age_group != null && allowedGroups.has(p.profiles.age_group))
  }

  // 내가 좋아요한 게시글 ID 목록
  let likedPostIds = new Set<string>()
  if (user && posts.length > 0) {
    const postIds = posts.map((p) => p.id)
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
    likedPostIds = new Set((likes ?? []).map((l) => l.post_id))
  }

  // 탭 레이블 (내 성별 기준 반대 성별)
  const newMembersLabel =
    myGender === 'female' ? '최근 가입 남성' : '최근 가입 여성'

  return (
    <div className="flex flex-col min-h-full overscroll-y-contain">
      {/* 상단 헤더 */}
      <header className="sticky top-0 z-20 bg-bg-900/95 backdrop-blur-sm
                         border-b border-surface-700">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h1 className="text-text-strong text-lg font-semibold tracking-tight">
            욕망백서
          </h1>
          <NotificationBell />
        </div>

        {/* 필터 바 */}
        <div className="px-4 pb-3 space-y-2">
          {/* 성별 필터 */}
          <div className="flex gap-1.5 items-center">
            <FilterChip
              href={buildUrl({ sort, gender: undefined, role, region, age_band })}
              active={activeGender === null}
            >
              전체보기
            </FilterChip>
            <FilterChip
              href={buildUrl({ sort, gender: gender === 'male' ? undefined : 'male', role, region, age_band })}
              active={activeGender === 'male'}
            >
              남성
            </FilterChip>
            <FilterChip
              href={buildUrl({ sort, gender: gender === 'female' ? undefined : 'female', role, region, age_band })}
              active={activeGender === 'female'}
            >
              여성
            </FilterChip>
          </div>

          {/* 필터 버튼 (지역·나이·성향은 시트 안에서) */}
          <div className="flex gap-1.5 items-center">
            <HomeAdvancedFilter
              current={{ sort, gender, role, region, age_band }}
            />
          </div>
        </div>
      </header>

      {/* 정렬 탭 - 피드 바로 위 */}
      <div className="flex gap-1.5 px-4 pt-3 pb-1">
        <SortChip
          href={buildUrl({ sort: undefined, gender, role, region, age_band })}
          active={activeSort === 'latest'}
        >
          최신순
        </SortChip>
        <SortChip
          href={buildUrl({ sort: 'new_members', gender, role, region, age_band })}
          active={activeSort === 'new_members'}
        >
          {newMembersLabel}
        </SortChip>
      </div>

      {/* 피드 — PullToRefresh가 피드만 감싸서 인디케이터가 헤더 아래에 표시됨 */}
      <PullToRefresh>
        <div className="flex-1 px-4 py-3 space-y-3">
          {feedError ? (
            <FeedError />
          ) : posts.length === 0 ? (
            <EmptyState
              sort={activeSort}
              label={newMembersLabel}
              hasRegionOrAgeFilter={activeRegion !== null || activeAgeBands.length > 0}
            />
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={user?.id}
                myPoints={myPoints}
                likedByMe={likedPostIds.has(post.id)}
              />
            ))
          )}
        </div>
      </PullToRefresh>

      {/* FAB — 글쓰기 */}
      <Link
        href="/post/write"
        className="fixed bottom-[5.5rem] right-5 z-30
                   w-14 h-14 rounded-full bg-desire-500 shadow-lg
                   flex items-center justify-center
                   active:bg-desire-400 transition-colors"
        aria-label="글쓰기"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </Link>
    </div>
  )
}

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type PostWithProfile = Post & {
  like_count?: number
  profiles: Pick<Profile, 'id' | 'nickname' | 'gender' | 'age_group' | 'region' | 'role' | 'withdrawn_at'> | null
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
  likedByMe,
}: {
  post: PostWithProfile
  userId?: string
  myPoints: number | null
  likedByMe: boolean
}) {
  const profile = post.profiles
  const displayNickname = profile?.withdrawn_at ? '탈퇴한 사용자' : (profile?.nickname ?? '알 수 없음')
  const timeAgo = formatTimeAgo(post.created_at)
  const tags = post.tags
    ? post.tags.split(/[,·\s·]+/).map((t) => t.trim()).filter(Boolean).slice(0, 3)
    : []
  const isSelf = userId && profile?.id === userId
  const showDmButton = !isSelf && profile && myPoints !== null

  return (
    <article className="card relative">
      {/* 헤더: 작성자 정보 */}
      <div className="flex items-start justify-between mb-3.5">
        <Link
          href={`/profile/${profile?.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 active:opacity-70 transition-opacity"
        >
          {/* 아바타 */}
          <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center
                          flex-shrink-0 text-text-secondary text-sm font-semibold">
            {displayNickname[0] ?? '?'}
          </div>

          <div className="min-w-0">
            {/* 닉네임 · 성별 */}
            <div className="flex items-center gap-1.5">
              <span className="text-text-strong font-semibold text-[14px] leading-tight">
                {displayNickname}
              </span>
              {profile?.gender && (
                <span className="text-text-muted text-[11px]">
                  {profile.gender === 'male' ? '남' : profile.gender === 'female' ? '여' : ''}
                </span>
              )}
            </div>
            {/* 나이대 · 지역 */}
            <p className="text-text-muted text-[11px] mt-0.5 leading-tight">
              {[profile?.age_group, profile?.region].filter(Boolean).join(' · ')}
            </p>
          </div>
        </Link>

        {/* 시간 + 삭제 */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2 mt-0.5">
          <span className="text-text-muted text-[11px]">{timeAgo}</span>
          {isSelf && <DeletePostButton postId={post.id} iconOnly />}
        </div>
      </div>

      {/* 본문 */}
      <p className="text-text-primary text-[14px] leading-[1.75] whitespace-pre-wrap line-clamp-5">
        {post.content}
      </p>

      {/* 이미지 — 클릭하면 전체화면, 2장이면 좌우 분할 */}
      {post.image_url && (
        <PostImageViewer src={post.image_url} src2={post.image_url_2} />
      )}

      {/* 하단: 태그 + 액션 (구분선 없이 여백으로 분리) */}
      <div className="flex items-center justify-between gap-2 mt-4">
        {/* 태그 */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-chip text-[10px]
                         bg-surface-750 text-text-muted border border-surface-700/70"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* 액션 */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <LikeButton
            postId={post.id}
            initialCount={post.like_count ?? 0}
            initialLiked={likedByMe}
          />
          {showDmButton && (
            <HomeDmButton
              targetUserId={profile.id}
              targetNickname={displayNickname}
              targetAgeGroup={profile.age_group ?? ''}
              targetRegion={profile.region ?? ''}
              targetRole={profile.role ?? null}
              myPoints={myPoints}
            />
          )}
          {profile && (
            <ReportSheet targetUserId={profile.id} targetNickname={displayNickname} />
          )}
        </div>
      </div>
    </article>
  )
}

function FeedError() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">
        글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
      </p>
      <p className="text-text-muted text-sm">
        <Link href="/home" className="underline underline-offset-2">새로고침</Link>
      </p>
    </div>
  )
}

function EmptyState({
  sort,
  label,
  hasRegionOrAgeFilter,
}: {
  sort: string
  label: string
  hasRegionOrAgeFilter?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">
        {sort === 'new_members'
          ? `최근 가입한 ${label.replace('최근 가입 ', '')} 유저의 글이 없습니다`
          : hasRegionOrAgeFilter
            ? '선택한 지역·나이에 맞는 글이 없습니다'
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

function buildUrl(params: Record<string, string | string[] | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue
    if (Array.isArray(v)) {
      v.forEach((val) => val && sp.append(k, val))
    } else if (v) {
      sp.set(k, v)
    }
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
