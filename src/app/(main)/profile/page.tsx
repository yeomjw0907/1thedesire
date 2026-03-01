import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DeletePostButton } from '@/components/post/DeletePostButton'

export default async function MyProfilePage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/signup')

  const { data: posts } = await supabase
    .from('posts')
    .select('id, content, image_url, created_at')
    .eq('user_id', user.id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div className="flex flex-col min-h-full pb-8">
      {/* 프로필 헤더 */}
      <header className="px-6 pt-6 pb-5 border-b border-surface-700/40">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-text-strong text-[26px] font-semibold leading-tight mb-1.5">
              {profile.nickname}
            </h1>
            <p className="text-text-secondary text-sm">
              {profile.age_group} · {profile.region} · {genderLabel(profile.gender)}
            </p>
          </div>
          {/* 포인트 + 수정 버튼 */}
          <div className="flex flex-col items-end gap-2 mt-1">
            <span
              className="px-3 py-1 rounded-chip bg-surface-750 text-text-primary text-sm font-medium
                         border border-surface-700 tabular-nums"
              style={{ fontFamily: 'Montserrat, monospace' }}
            >
              {profile.points}P
            </span>
            <Link
              href="/profile/edit"
              className="text-text-muted text-xs active:text-text-secondary transition-colors"
            >
              프로필 수정
            </Link>
          </div>
        </div>

        {profile.role && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <span className="px-2.5 py-0.5 rounded-chip text-xs
                           bg-surface-750 text-text-secondary border border-surface-700">
              {profile.role.split(/[,·\s·]+/)[0]?.trim() ?? profile.role}
            </span>
          </div>
        )}
      </header>

      {/* 자기소개 */}
      {profile.bio && (
        <section className="px-6 py-4 border-b border-surface-700/40">
          <p className="text-text-secondary text-[14px] leading-6 whitespace-pre-wrap">
            {profile.bio}
          </p>
        </section>
      )}

      {/* 내 글 목록 */}
      <section className="px-4 pt-5 pb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h2 className="text-text-muted text-[11px] font-medium tracking-widest uppercase">
            내 분위기
          </h2>
          <Link
            href="/post/write"
            className="flex items-center gap-1.5 text-desire-400 text-xs font-medium
                       active:opacity-70 transition-opacity"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 글
          </Link>
        </div>

        {!posts || posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-text-muted text-sm mb-3">아직 남긴 분위기가 없습니다</p>
            <Link
              href="/post/write"
              className="px-5 py-2.5 rounded-chip bg-desire-500/15 text-desire-400
                         text-sm font-medium active:bg-desire-500/25 transition-colors"
            >
              첫 분위기 남기기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="card">
                {post.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={post.image_url}
                    alt=""
                    className="w-full max-h-40 object-cover rounded-xl mb-3 opacity-80"
                  />
                )}
                <p className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                <div className="flex items-center justify-between mt-3 pt-2
                                border-t border-surface-700/60">
                  <span className="text-text-muted text-xs">{formatTimeAgo(post.created_at)}</span>
                  <DeletePostButton postId={post.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function genderLabel(gender: string): string {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return '기타'
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
