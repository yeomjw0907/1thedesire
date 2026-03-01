'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setPostStatus } from '@/lib/actions/admin'

interface Props {
  postId: string
  currentStatus: string
}

export function AdminPostActions({ postId, currentStatus }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const newStatus = currentStatus === 'hidden' ? 'published' : 'hidden'
    startTransition(async () => {
      await setPostStatus(postId, newStatus)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`px-2.5 py-1 rounded-chip text-[11px] font-medium border
                 disabled:opacity-40 active:opacity-70 transition-opacity
                 ${currentStatus === 'hidden'
                   ? 'bg-trust-500/15 text-trust-400 border-trust-500/30'
                   : 'bg-state-warning/15 text-state-warning border-state-warning/30'}`}
    >
      {currentStatus === 'hidden' ? '복구' : '숨김'}
    </button>
  )
}
