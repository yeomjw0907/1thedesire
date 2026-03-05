'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { unblockUser } from '@/lib/actions/social'

interface BlockedProfile {
  id: string
  nickname: string | null
  avatar_url: string | null
}

interface Props {
  initialList: BlockedProfile[]
}

export function BlockListClient({ initialList }: Props) {
  const router = useRouter()
  const [list, setList] = useState<BlockedProfile[]>(initialList)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleUnblock(blockedUserId: string) {
    if (unblockingId != null || isPending) return
    setUnblockingId(blockedUserId)
    startTransition(async () => {
      const result = await unblockUser(blockedUserId)
      if (result.success) {
        setList((prev) => prev.filter((p) => p.id !== blockedUserId))
        toast.success('차단을 해제했습니다.')
        router.refresh()
      } else {
        toast.error(result.error?.message ?? '차단 해제에 실패했습니다.')
      }
      setUnblockingId(null)
    })
  }

  return (
    <ul className="space-y-2">
      {list.map((profile) => {
        const displayName = profile.nickname ?? '알 수 없음'
        const isUnblocking = unblockingId === profile.id

        return (
          <li
            key={profile.id}
            className="flex items-center gap-3 p-4 rounded-2xl bg-surface-800 border border-surface-700/50"
          >
            <Link
              href={`/profile/${profile.id}`}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-10 h-10 rounded-full bg-surface-700 flex-shrink-0 overflow-hidden
                              flex items-center justify-center text-lg font-semibold text-text-muted">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName[0] ?? '?'}</span>
                )}
              </div>
              <span className="text-text-primary text-sm font-medium truncate">{displayName}</span>
            </Link>
            <button
              type="button"
              onClick={() => handleUnblock(profile.id)}
              disabled={isUnblocking || isPending}
              className="flex-shrink-0 px-4 py-2 rounded-chip text-xs font-medium
                         bg-surface-700 text-text-secondary
                         hover:bg-surface-600 active:bg-surface-600
                         disabled:opacity-50 transition-colors"
            >
              {isUnblocking ? '해제 중...' : '차단 해제'}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
