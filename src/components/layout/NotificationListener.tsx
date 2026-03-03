'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useNotifications } from '@/lib/context/NotificationContext'
import type { LikeNotification } from '@/lib/context/NotificationContext'
import { usePathname } from 'next/navigation'

interface Props {
  userId: string
}

export function NotificationListener({ userId }: Props) {
  const { incrementDm, resetDm, addLikeNotification, setLikeNotifications } = useNotifications()
  const pathname = usePathname()

  // DM 탭 진입 시 배지 초기화
  useEffect(() => {
    if (pathname.startsWith('/dm')) resetDm()
  }, [pathname, resetDm])

  // 마운트 시: 기존 unread 좋아요 알림 초기 로드
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('notifications')
      .select('id, actor_id, actor_nickname, post_id, read, created_at')
      .eq('user_id', userId)
      .eq('type', 'like')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        if (!data) return
        const list: LikeNotification[] = data.map((n) => ({
          id: n.id,
          actorId: n.actor_id,
          actorNickname: n.actor_nickname ?? '누군가',
          postId: n.post_id,
          createdAt: n.created_at,
          read: n.read,
        }))
        setLikeNotifications(list)
      })
  }, [userId, setLikeNotifications])

  useEffect(() => {
    const supabase = createClient()

    // DM 메시지 실시간 구독
    const dmChannel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as { sender_id: string; room_id: string; message_type: string }
          if (msg.sender_id === userId) return
          if (msg.message_type === 'system') return

          const { data: room } = await supabase
            .from('chat_rooms')
            .select('id')
            .eq('id', msg.room_id)
            .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`)
            .maybeSingle()
          if (!room) return

          if (!window.location.pathname.startsWith('/dm')) incrementDm()

          toast('새 메시지', {
            description: 'DM 탭에서 확인하세요',
            action: {
              label: '확인',
              onClick: () => { resetDm(); window.location.href = '/dm' },
            },
            duration: 5000,
          })
        }
      )
      .subscribe()

    // 좋아요 알림 실시간 구독
    const likeChannel = supabase
      .channel(`like-notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as {
            id: string
            actor_id: string | null
            actor_nickname: string | null
            post_id: string
            created_at: string
          }

          const notification: LikeNotification = {
            id: n.id,
            actorId: n.actor_id,
            actorNickname: n.actor_nickname ?? '누군가',
            postId: n.post_id,
            createdAt: n.created_at,
            read: false,
          }

          addLikeNotification(notification)
          toast(`${notification.actorNickname}가 좋아요를 눌렀습니다`, { duration: 4000 })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dmChannel)
      supabase.removeChannel(likeChannel)
    }
  }, [userId, incrementDm, resetDm, addLikeNotification])

  return null
}
