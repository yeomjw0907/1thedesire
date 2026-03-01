import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { ReportSheet } from '@/components/profile/ReportSheet'
import type { Profile, Post } from '@/types'

/**
 * 검색 화면
 * 기준 문서: search-discovery-ux-v0.1.md
 *
 * 탭: 프로필 / 분위기(게시글)
 * 필터: 지역, 성향 태그
 */

const QUICK_REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전'] as const
const QUICK_ROLES = ['Dom', 'Sub', 'Switch', 'FWB', '감성 연애', '대화 위주'] as const

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; region?: string; role?: string; tab?: string }>
}) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { q, region, role, tab } = await searchParams
  const activeTab = tab === 'posts' ? 'posts' : 'profiles'
  const hasQuery = !!(q || region || role)

  let profiles: ProfileResult[] = []
  let posts: PostResult[] = []

  if (hasQuery) {
    if (activeTab === 'profiles') {
      let query = supabase
        .from('profiles')
        .select('id, nickname, gender, age_group, region, role, bio')
        .eq('account_status', 'active')
        .neq('id', user.id)
        .limit(30)

      if (q) query = query.ilike('nickname', `%${q}%`)
      if (region) query = query.eq('region', region)
      if (role) query = query.ilike('role', `%${role}%`)

      const { data } = await query
      profiles = (data ?? []) as ProfileResult[]
    } else {
      let query = supabase
        .from('posts')
        .select(`
          id, content, created_at,
          profiles:user_id (id, nickname, age_group, region, role)
        `)
        .eq('status', 'published')
        .limit(30)

      if (q) query = query.ilike('content', `%${q}%`)

      const { data } = await query
      posts = (data ?? []) as unknown as PostResult[]
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* 헤더 + 검색창 */}
      <header className="sticky top-0 z-10 bg-bg-900/95 backdrop-blur-sm
                         border-b border-surface-700 px-4 pt-4 pb-3">
        <form method="get" action="/search" className="flex gap-2 mb-3">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="닉네임, 성향으로 찾아보세요"
            className="flex-1 input-field text-sm py-2.5"
            autoComplete="off"
          />
          {activeTab === 'posts' && <input type="hidden" name="tab" value="posts" />}
          {region && <input type="hidden" name="region" value={region} />}
          {role && <input type="hidden" name="role" value={role} />}
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-desire-500/15 text-desire-400
                       text-sm font-medium active:bg-desire-500/25 transition-colors"
          >
            검색
          </button>
        </form>

        {/* 탭 */}
        <div className="flex gap-1">
          <TabLink href={buildUrl({ q, region, role })} active={activeTab === 'profiles'}>
            프로필
          </TabLink>
          <TabLink href={buildUrl({ q, region, role, tab: 'posts' })} active={activeTab === 'posts'}>
            분위기
          </TabLink>
        </div>
      </header>

      {/* 빠른 필터 (프로필 탭만) */}
      {activeTab === 'profiles' && (
        <div className="px-4 py-3 border-b border-surface-700/30 space-y-2.5">
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-text-muted text-[11px] flex-shrink-0">지역</span>
            {QUICK_REGIONS.map((r) => (
              <Link
                key={r}
                href={buildUrl({ q, region: region === r ? undefined : r, role })}
                className={`px-2.5 py-1 rounded-chip text-[11px] font-medium border transition-colors
                           ${region === r
                             ? 'bg-desire-500/15 text-desire-400 border-desire-500/30'
                             : 'bg-surface-750 text-text-muted border-surface-700'}`}
              >
                {r}
              </Link>
            ))}
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-text-muted text-[11px] flex-shrink-0">성향</span>
            {QUICK_ROLES.map((r) => (
              <Link
                key={r}
                href={buildUrl({ q, region, role: role === r ? undefined : r })}
                className={`px-2.5 py-1 rounded-chip text-[11px] font-medium border transition-colors
                           ${role === r
                             ? 'bg-trust-500/15 text-trust-400 border-trust-500/30'
                             : 'bg-surface-750 text-text-muted border-surface-700'}`}
              >
                {r}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 결과 */}
      <div className="flex-1 px-4 py-4 space-y-3">
        {!hasQuery ? (
          <EmptyPrompt />
        ) : activeTab === 'profiles' ? (
          profiles.length === 0 ? <EmptyResult /> : profiles.map((p) => <ProfileCard key={p.id} profile={p} />)
        ) : (
          posts.length === 0 ? <EmptyResult /> : posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  )
}

type ProfileResult = Pick<Profile, 'id' | 'nickname' | 'gender' | 'age_group' | 'region' | 'role' | 'bio'>
type PostResult = Pick<Post, 'id' | 'content' | 'created_at'> & {
  profiles: Pick<Profile, 'id' | 'nickname' | 'age_group' | 'region' | 'role'> | null
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-4 py-1.5 rounded-chip text-sm font-medium transition-colors duration-150
                 ${active ? 'bg-desire-500/15 text-desire-400' : 'text-text-muted'}`}
    >
      {children}
    </Link>
  )
}

function ProfileCard({ profile }: { profile: ProfileResult }) {
  const tags = profile.role
    ? profile.role.split(/[,·\s·]+/).filter(Boolean).slice(0, 3)
    : []

  return (
    <Link href={`/profile/${profile.id}`} className="block">
      <div className="card active:opacity-70 transition-opacity">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-text-strong font-medium text-sm">{profile.nickname}</p>
            <p className="text-text-muted text-xs mt-0.5">
              {profile.age_group} · {profile.region}
            </p>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-chip text-[11px]
                                            bg-surface-750 text-text-muted border border-surface-700">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="text-text-muted flex-shrink-0 mt-1">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        {profile.bio && (
          <p className="text-text-secondary text-xs mt-2.5 leading-5 line-clamp-2">
            {profile.bio}
          </p>
        )}
      </div>
    </Link>
  )
}

function PostCard({ post }: { post: PostResult }) {
  const profile = post.profiles
  return (
    <article className="card">
      {profile && (
        <div className="flex items-baseline gap-2 mb-2">
          <Link href={`/profile/${profile.id}`} className="text-text-strong font-medium text-sm">
            {profile.nickname}
          </Link>
          <span className="text-text-muted text-xs">{profile.age_group} · {profile.region}</span>
        </div>
      )}
      <p className="text-text-primary text-[14px] leading-6 line-clamp-4 whitespace-pre-wrap">
        {post.content}
      </p>
      {profile && (
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-surface-700/60">
          <Link href={`/profile/${profile.id}`}
            className="text-text-muted text-xs active:text-text-secondary transition-colors">
            프로필 보기
          </Link>
          <span className="text-surface-700 text-xs">·</span>
          <ReportSheet targetUserId={profile.id} targetNickname={profile.nickname} />
        </div>
      )}
    </article>
  )
}

function EmptyPrompt() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">검색어를 입력해보세요</p>
      <p className="text-text-muted text-sm">닉네임이나 지역·성향 필터로 찾을 수 있어요</p>
    </div>
  )
}

function EmptyResult() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-text-muted text-base mb-2">검색 결과가 없습니다</p>
      <p className="text-text-muted text-sm">다른 검색어나 필터를 시도해보세요</p>
    </div>
  )
}

function buildUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v)
  }
  const qs = sp.toString()
  return `/search${qs ? `?${qs}` : ''}`
}
