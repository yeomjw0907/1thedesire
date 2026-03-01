'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { acceptDmRequest, declineDmRequest, blockFromRoom } from '@/lib/actions/dm'
import { sendMessage } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'
import type { ChatRoomStatus } from '@/types'

interface Message {
  id: string
  sender_id: string
  content: string
  message_type: 'text' | 'system'
  message_status: string
  created_at: string
}

interface RoomInfo {
  id: string
  status: ChatRoomStatus
  initiator_id: string
  receiver_id: string
  request_expires_at: string | null
}

interface Props {
  room: RoomInfo
  messages: Message[]
  currentUserId: string
  otherNickname: string
}

export function ChatRoomClient({ room, messages, currentUserId, otherNickname }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msgText, setMsgText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
  const bottomRef = useRef<HTMLDivElement>(null)

  const isReceiver = room.receiver_id === currentUserId
  const isPending2 = room.status === 'pending'
  const isAgreed = room.status === 'agreed'

  // 메시지 prop 동기화
  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  // Supabase Realtime 구독
  useEffect(() => {
    if (!isAgreed) return
    const supabase = createClient()
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload: { new: Message }) => {
          const newMsg = payload.new
          // 본인이 보낸 메시지는 이미 optimistic update로 추가됐을 수 있으므로 중복 방지
          setLocalMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id, isAgreed])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptDmRequest(room.id)
      if (result.success) {
        router.refresh()
      } else {
        setLocalError(result.error?.message ?? '수락에 실패했습니다')
      }
    })
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineDmRequest(room.id)
      if (result.success) {
        router.push('/dm')
      } else {
        setLocalError(result.error?.message ?? '거절에 실패했습니다')
      }
    })
  }

  function handleBlock() {
    startTransition(async () => {
      const result = await blockFromRoom(room.id)
      if (result.success) {
        router.push('/dm')
      } else {
        setLocalError(result.error?.message ?? '차단에 실패했습니다')
      }
    })
  }

  function handleSend() {
    const text = msgText.trim()
    if (!text) return
    setLocalError(null)
    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      content: text,
      message_type: 'text',
      message_status: 'active',
      created_at: new Date().toISOString(),
    }
    setLocalMessages((prev) => [...prev, tempMsg])
    setMsgText('')
    startTransition(async () => {
      const result = await sendMessage(room.id, text)
      if (result.success) {
        // Realtime으로 실제 메시지가 도착하면 tempId 제거
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempId))
      } else {
        // 실패 시 optimistic 메시지 제거 + 에러 표시
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempId))
        setMsgText(text)
        setLocalError(result.error?.message ?? '전송에 실패했습니다')
      }
    })
  }

  const statusLabel: Partial<Record<ChatRoomStatus, string>> = {
    pending: '수락 대기 중',
    declined: '거절된 요청',
    expired: '만료된 요청',
    blocked: '차단된 채팅방',
  }

  return (
    <div className="flex flex-col h-full">
      {/* 수신자 패널: pending 상태 */}
      {isPending2 && isReceiver && (
        <div className="px-4 py-4 border-b border-surface-700/60 bg-surface-750/50">
          <p className="text-text-primary text-sm font-medium mb-1">
            {otherNickname}님의 대화 요청
          </p>
          <p className="text-text-muted text-xs mb-4">
            수락하면 대화를 시작할 수 있습니다. 거절하면 상대방에게 45P가 환불됩니다.
          </p>
          {localError && (
            <p className="text-state-danger text-sm mb-3">{localError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDecline}
              disabled={isPending}
              className="flex-1 py-3 rounded-chip bg-surface-700 text-text-secondary
                         text-sm font-medium active:bg-surface-700/70
                         disabled:opacity-40 transition-colors"
            >
              거절
            </button>
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="flex-1 py-3 rounded-chip bg-desire-500 text-white
                         text-sm font-semibold active:bg-desire-400
                         disabled:opacity-40 transition-colors"
            >
              {isPending ? '처리 중...' : '수락'}
            </button>
          </div>
        </div>
      )}

      {/* 발신자 패널: pending 상태 */}
      {isPending2 && !isReceiver && (
        <div className="px-4 py-4 border-b border-surface-700/60 bg-surface-750/50">
          <p className="text-text-muted text-sm text-center">
            {otherNickname}님의 수락을 기다리고 있습니다
          </p>
          {room.request_expires_at && (
            <p className="text-text-muted text-xs text-center mt-1">
              <ExpiryText expiresAt={room.request_expires_at} />
            </p>
          )}
          {!showBlockConfirm && (
            <p className="text-center mt-3">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(true)}
                className="text-state-danger text-xs active:opacity-70"
              >
                요청 취소(차단)
              </button>
            </p>
          )}
          {showBlockConfirm && (
            <div className="mt-3 pt-3 border-t border-surface-700/50">
              <p className="text-text-primary text-sm mb-2">
                요청을 취소하면 90P가 환불되지 않습니다. 진행하시겠습니까?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBlockConfirm(false)}
                  className="flex-1 py-2 rounded-chip bg-surface-700 text-text-secondary text-xs"
                >
                  돌아가기
                </button>
                <button
                  onClick={handleBlock}
                  disabled={isPending}
                  className="flex-1 py-2 rounded-chip bg-state-danger/80 text-white text-xs
                             disabled:opacity-40"
                >
                  {isPending ? '처리 중...' : '취소(차단)'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 종료된 방 안내 */}
      {!isPending2 && !isAgreed && (
        <div className="px-4 py-3 border-b border-surface-700/60 bg-surface-750/50">
          <p className="text-text-muted text-sm text-center">
            {statusLabel[room.status] ?? '종료된 대화'}
          </p>
        </div>
      )}

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {localMessages.length === 0 && isAgreed && (
          <p className="text-center text-text-muted text-sm py-8">
            대화를 시작해보세요
          </p>
        )}
        {localMessages.map((msg) => {
          if (msg.message_type === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="px-3 py-1.5 rounded-chip bg-surface-750 text-text-muted
                                 text-xs border border-surface-700/50">
                  {msg.content}
                </span>
              </div>
            )
          }

          const isMine = msg.sender_id === currentUserId
          const isDeleted = msg.message_status === 'deleted'

          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-5
                            ${isMine
                              ? 'bg-desire-500/20 text-text-primary rounded-br-sm'
                              : 'bg-surface-750 text-text-primary rounded-bl-sm border border-surface-700/50'
                            }
                            ${isDeleted ? 'opacity-40 italic' : ''}`}
              >
                {isDeleted ? '삭제된 메시지입니다' : msg.content}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 에러 */}
      {localError && (
        <div className="px-4 py-2 border-t border-surface-700/60">
          <p className="text-state-danger text-xs">{localError}</p>
        </div>
      )}

      {/* 차단 버튼 (agreed 상태) */}
      {isAgreed && !showBlockConfirm && (
        <div className="px-4 pb-2 border-t border-surface-700/60 pt-2">
          <button
            onClick={() => setShowBlockConfirm(true)}
            className="text-state-danger text-xs active:opacity-70"
          >
            이 사용자 차단
          </button>
        </div>
      )}

      {/* 차단 확인 (agreed 상태) */}
      {showBlockConfirm && isAgreed && (
        <div className="px-4 py-3 border-t border-surface-700/60 bg-surface-750/50">
          <p className="text-text-primary text-sm mb-3">
            {otherNickname}님을 차단하시겠습니까? 이 작업은 되돌릴 수 없으며, 환불되지 않습니다.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBlockConfirm(false)}
              className="flex-1 py-2.5 rounded-chip bg-surface-700 text-text-secondary
                         text-sm active:opacity-70 transition-opacity"
            >
              취소
            </button>
            <button
              onClick={handleBlock}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-chip bg-state-danger/80 text-white
                         text-sm font-medium active:opacity-70
                         disabled:opacity-40 transition-opacity"
            >
              {isPending ? '처리 중...' : '차단'}
            </button>
          </div>
        </div>
      )}

      {/* 메시지 입력 */}
      {isAgreed && !showBlockConfirm && (
        <div className="px-4 py-3 border-t border-surface-700/60 flex items-end gap-2">
          <textarea
            value={msgText}
            onChange={(e) => setMsgText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="메시지 입력..."
            rows={1}
            maxLength={1000}
            className="flex-1 bg-surface-750 text-text-primary text-sm px-4 py-3
                       rounded-2xl border border-surface-700/50 resize-none
                       placeholder:text-text-muted focus:outline-none
                       focus:border-surface-600 transition-colors"
            style={{ maxHeight: 120, overflowY: 'auto' }}
          />
          <button
            onClick={handleSend}
            disabled={isPending || !msgText.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-full bg-desire-500 flex items-center
                       justify-center active:bg-desire-400
                       disabled:opacity-40 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

function ExpiryText({ expiresAt }: { expiresAt: string }) {
  const remaining = new Date(expiresAt).getTime() - Date.now()
  if (remaining <= 0) return <span>만료됨</span>
  const hours = Math.floor(remaining / 3600000)
  const mins = Math.floor((remaining % 3600000) / 60000)
  if (hours > 0) return <span>{hours}시간 {mins}분 남음</span>
  return <span>{mins}분 남음</span>
}
