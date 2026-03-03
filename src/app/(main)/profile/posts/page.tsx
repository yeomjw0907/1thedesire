import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { DeletePostButton } from '@/components/post/DeletePostButton'
import { PostImageViewer } from '@/components/post/PostImageViewer'

const PAGE_SIZE = 20

export default async function MyPostsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ count }, { data: posts }] = await Promise.all([
    supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'published'),
    supabase
      .from('posts')
      .select('id, content, image_url, image_url_2, like_count, created_at')
      .eq('user_id', user.id)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(from, to),
  ])

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  return (
    <div className="flex flex-col min-h-full pb-8">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-surface-700/60 sticky top-0 z-10 bg-bg-900/95 backdrop-blur-sm">
        <Link
          href="/profile"
          className="text-text-muted active:text-text-secondary transition-colors p-1 -ml-1"
          aria-label="프로필로 돌아가기"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-text-strong text-base font-semibold">내 글 전체</h1>
      </header>

      <div className="px-4 pt-4">
        {!posts || posts.length === 0 ? (
          <div className="bg-surface-800 rounded-2xl px-4 py-16 text-center">
            <p className="text-text-muted text-sm">작성한 글이 없습니다.</p>
            <Link
              href="/profile"
              className="inline-block mt-3 text-desire-400 text-sm font-medium active:opacity-70"
            >
              프로필로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-2.5">
              {posts.map((post) => (
                <div key={post.id} className="bg-surface-800 rounded-2xl p-4">
                  {post.image_url && (
                    <PostImageViewer src={post.image_url} src2={post.image_url_2} />
                  )}
                  <p className="text-text-primary text-[14px] leading-[1.75] whitespace-pre-wrap mt-1">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-700/50">
                    <div className="flex items-center gap-3">
                      <span className="text-text-muted text-[11px]">
                        {formatTimeAgo(post.created_at)}
                      </span>
                      {(post.like_count ?? 0) > 0 && (
                        <span className="flex items-center gap-1 text-desire-400/80 text-[11px]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                          </svg>
                          {post.like_count}
                        </span>
                      )}
                    </div>
                    <DeletePostButton postId={post.id} />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <nav className="flex items-center justify-center gap-2 mt-6 pb-4" aria-label="페이지 이동">
                {currentPage > 1 ? (
                  <Link
                    href={currentPage === 2 ? '/profile/posts' : `/profile/posts?page=${currentPage - 1}`}
                    className="px-4 py-2 rounded-chip bg-surface-800 border border-surface-700 text-text-secondary text-sm font-medium active:bg-surface-750"
                  >
                    이전
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-chip bg-surface-800/50 border border-surface-700/50 text-text-muted text-sm">
                    이전
                  </span>
                )}
                <span className="text-text-muted text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                {currentPage < totalPages ? (
                  <Link
                    href={`/profile/posts?page=${currentPage + 1}`}
                    className="px-4 py-2 rounded-chip bg-surface-800 border border-surface-700 text-text-secondary text-sm font-medium active:bg-surface-750"
                  >
                    다음
                  </Link>
                ) : (
                  <span className="px-4 py-2 rounded-chip bg-surface-800/50 border border-surface-700/50 text-text-muted text-sm">
                    다음
                  </span>
                )}
              </nav>
            )}
          </>
        )}
      </div>
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
  return new Date(dateString).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
  })
}
