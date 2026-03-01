'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deletePost } from '@/lib/actions/posts'

interface Props {
  postId: string
}

export function DeletePostButton({ postId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm('이 글을 삭제할까요?')) return
    startTransition(async () => {
      await deletePost(postId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-text-muted text-xs active:text-state-danger
                 disabled:opacity-40 transition-colors"
    >
      {isPending ? '삭제 중...' : '삭제'}
    </button>
  )
}
