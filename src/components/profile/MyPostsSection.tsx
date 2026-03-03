'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getMyPosts, type MyPostRow } from '@/lib/actions/posts'
import { DeletePostButton } from '@/components/post/DeletePostButton'
import { PostImageViewer } from '@/components/post/PostImageViewer'

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

function PostCard({ post }: { post: MyPostRow }) {
  return (
    <div className="bg-surface-800 rounded-2xl p-4">
      {post.image_url && (
        <PostImageViewer src={post.image_url} src2={post.image_url_2} />
      )}
      <p className="text-text-primary text-[14px] leading-[1.75] whitespace-pre-wrap mt-1">
        {post.content}
      </p>
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-700/50">
        <div className="flex items-center gap-3">
          <span className="text-text-muted text-[11px]">{formatTimeAgo(post.created_at)}</span>
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
  )
}

interface Props {
  initialPosts: MyPostRow[]
  hasMoreInitially: boolean
}

export function MyPostsSection({ initialPosts, hasMoreInitially }: Props) {
  const [posts, setPosts] = useState<MyPostRow[]>(initialPosts)
  const [hasMore, setHasMore] = useState(hasMoreInitially)
  const [loading, setLoading] = useState(false)

  async function loadMore() {
    if (loading || !hasMore) return
    setLoading(true)
    const res = await getMyPosts(posts.length)
    setLoading(false)
    if (res.success && res.data) {
      setPosts((prev) => [...prev, ...res.data!.posts])
      setHasMore(res.data.hasMore)
    }
  }

  if (posts.length === 0) {
    return (
      <section id="my-posts" className="px-4 pt-2 pb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest">
            내 글
          </p>
          <Link href="/post/write" className="text-desire-400 text-xs font-medium active:opacity-70">
            새 글
          </Link>
        </div>
        <div className="bg-surface-800 rounded-2xl px-4 py-12 text-center">
          <p className="text-text-muted text-sm mb-3">아직 작성한 글이 없습니다</p>
          <Link
            href="/post/write"
            className="inline-block px-5 py-2.5 rounded-chip bg-desire-500/15 text-desire-400 text-sm font-medium active:bg-desire-500/25"
          >
            첫 글 남기기
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section id="my-posts" className="px-4 pt-2 pb-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-text-muted text-[10px] font-semibold uppercase tracking-widest">
          내 글
        </p>
        <div className="flex items-center gap-3">
          <Link href="/profile/posts" className="text-text-muted text-xs font-medium active:text-text-secondary">
            전체 보기
          </Link>
          <Link href="/post/write" className="text-desire-400 text-xs font-medium active:opacity-70">
            새 글
          </Link>
        </div>
      </div>
      <div className="space-y-2.5">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="px-5 py-2.5 rounded-chip bg-surface-800 border border-surface-700
                       text-text-secondary text-sm font-medium active:bg-surface-750
                       disabled:opacity-50 transition-opacity"
          >
            {loading ? '불러오는 중…' : '더보기'}
          </button>
        </div>
      )}
    </section>
  )
}
