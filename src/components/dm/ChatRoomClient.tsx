'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { acceptDmRequest, blockFromRoom } from '@/lib/actions/dm'
import { sendMessage, uploadDmImage, markMessagesAsRead } from '@/lib/actions/messages'
import { createClient } from '@/lib/supabase/client'
import type { ChatRoomStatus } from '@/types'

interface Message {
  id: string
  sender_id: string
  content: string
  message_type: 'text' | 'system' | 'image'
  message_status: string
  created_at: string
  image_url?: string | null
  read_at?: string | null
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
  /** 상대방 프로필 이미지 URL (말풍선 옆 표시) */
  otherAvatarUrl?: string | null
  /** 신고로 인한 입력 잠금 (양측 표시) */
  roomReported?: boolean
}

export function ChatRoomClient({ room, messages, currentUserId, otherNickname, otherAvatarUrl = null, roomReported = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [msgText, setMsgText] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const [showBlockConfirm, setShowBlockConfirm] = useState(false)
  const [localMessages, setLocalMessages] = useState<Message[]>(messages)
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isReceiver = room.receiver_id === currentUserId
  const isPending2 = room.status === 'pending'
  const isAgreed = room.status === 'agreed'
  const isLocked = room.status === 'blocked' || roomReported

  // 메시지 prop 동기화
  useEffect(() => {
    setLocalMessages(messages)
  }, [messages])

  // 미리보기용 object URL 정리
  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl)
    }
  }, [pendingImage])

  // 진입 시 상대 메시지 읽음 처리 (수신자만)
  useEffect(() => {
    if (!isAgreed || !isReceiver) return
    const otherMessageIds = localMessages
      .filter((m) => m.sender_id !== currentUserId && m.message_type !== 'system')
      .map((m) => m.id)
    if (otherMessageIds.length === 0) return
    markMessagesAsRead(room.id, otherMessageIds)
  }, [room.id, isAgreed, isReceiver]) // eslint-disable-line react-hooks/exhaustive-deps -- 진입 시 1회만

  // Supabase Realtime: INSERT + UPDATE(read_at)
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
          setLocalMessages((prev) => {
            const existingIdx = prev.findIndex((m) => m.id === newMsg.id)
            if (existingIdx >= 0) {
              // 이미 있으면 병합 (Realtime 페이로드에 image_url 등 누락될 수 있음)
              const merged: Message = {
                ...newMsg,
                image_url: newMsg.image_url ?? prev[existingIdx].image_url,
                content: newMsg.content ?? prev[existingIdx].content,
                message_type: newMsg.message_type ?? prev[existingIdx].message_type,
              }
              return prev.map((m, i) => (i === existingIdx ? merged : m))
            }
            return [...prev, newMsg]
          })
          if (isReceiver && newMsg.sender_id !== currentUserId && newMsg.message_type !== 'system') {
            markMessagesAsRead(room.id, [newMsg.id])
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` },
        (payload: { new: { id: string; read_at?: string | null } }) => {
          const { id: msgId, read_at } = payload.new
          setLocalMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, read_at } : m))
          )
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room.id, isAgreed, isReceiver, currentUserId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [localMessages])

  useEffect(() => { setMounted(true) }, [])

  // 라이트박스 열림 시 body 스크롤 잠금
  useEffect(() => {
    if (lightboxImageUrl) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxImageUrl])

  // ESC 키로 라이트박스 닫기
  useEffect(() => {
    if (!lightboxImageUrl) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightboxImageUrl(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [lightboxImageUrl])

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

  function handleSend(imageUrl?: string | null, captionOverride?: string) {
    const text = (captionOverride !== undefined ? captionOverride : msgText).trim()
    if (!text && !imageUrl) return
    setLocalError(null)
    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      content: text,
      message_type: imageUrl ? 'image' : 'text',
      message_status: 'active',
      created_at: new Date().toISOString(),
      ...(imageUrl ? { image_url: imageUrl } : {}),
    }
    setLocalMessages((prev) => [...prev, tempMsg])
    if (!imageUrl) setMsgText('')
    startTransition(async () => {
      const result = await sendMessage(room.id, text, imageUrl ?? undefined)
      if (result.success && result.data?.message) {
        const realMsg = result.data.message
        setLocalMessages((prev) => {
          const next = prev.map((m) => (m.id === tempId ? realMsg : m))
          // Realtime이 먼저 도착해 같은 id로 중복 들어왔을 수 있음 → id 기준 한 건만 유지, image_url 보존
          const byId = new Map<string, Message>()
          next.forEach((m) => {
            const existing = byId.get(m.id)
            if (!existing) {
              byId.set(m.id, m)
            } else {
              byId.set(m.id, {
                ...existing,
                ...m,
                image_url: m.image_url ?? existing.image_url,
                message_type: (m.message_type || existing.message_type) as Message['message_type'],
              })
            }
          })
          return [...byId.values()].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        })
      } else if (!result.success) {
        setLocalMessages((prev) => prev.filter((m) => m.id !== tempId))
        if (!imageUrl) setMsgText(text)
        setLocalError(result.error?.message ?? '전송에 실패했습니다')
      }
    })
  }

  // 이미지 선택 시 미리보기만 (카톡처럼 확인 후 전송)
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('이미지 파일만 선택할 수 있습니다')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError('이미지는 5MB 이하로 선택해주세요')
      return
    }
    setLocalError(null)
    const prev = pendingImage
    if (prev) URL.revokeObjectURL(prev.previewUrl)
    setPendingImage({ file, previewUrl: URL.createObjectURL(file) })
  }

  function clearPendingImage() {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage.previewUrl)
      setPendingImage(null)
    }
  }

  async function sendPendingImage() {
    if (!pendingImage) return
    setLocalError(null)
    setIsUploadingImage(true)
    const caption = msgText.trim()
    const formData = new FormData()
    formData.set('file', pendingImage.file)
    const uploadRes = await uploadDmImage(room.id, formData)
    if (uploadRes.success && uploadRes.data?.url) {
      URL.revokeObjectURL(pendingImage.previewUrl)
      setPendingImage(null)
      setMsgText('')
      handleSend(uploadRes.data.url, caption)
    } else {
      setLocalError(uploadRes.error?.message ?? '이미지 업로드에 실패했습니다')
    }
    setIsUploadingImage(false)
  }

  const statusLabel: Partial<Record<ChatRoomStatus, string>> = {
    pending: '수락 대기 중',
    expired: '만료된 요청',
    blocked: '차단된 채팅방',
  }

  return (
    <>
    <div className="flex flex-col h-full min-h-0">
      {/* 수신자 패널: pending 상태 */}
      {isPending2 && isReceiver && (
        <div className="px-4 py-4 border-b border-surface-700/60 bg-surface-750/50">
          <p className="text-text-primary text-sm font-medium mb-1">
            {otherNickname}님의 대화 요청
          </p>
          <p className="text-text-muted text-xs mb-4">
            수락하면 대화를 시작할 수 있습니다. 원하지 않으면 응답 없이 두면 24시간 후 자동 만료됩니다.
          </p>
          {localError && (
            <p className="text-state-danger text-sm mb-3">{localError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="flex-1 py-3 rounded-chip bg-desire-500 text-white
                         text-sm font-semibold active:bg-desire-400
                         disabled:opacity-40 transition-colors"
            >
              {isPending ? '처리 중...' : '수락하기'}
            </button>
          </div>
          {!showBlockConfirm && (
            <p className="text-center mt-3">
              <button
                type="button"
                onClick={() => setShowBlockConfirm(true)}
                className="text-state-danger text-xs active:opacity-70"
              >
                이 사용자 차단
              </button>
            </p>
          )}
          {showBlockConfirm && (
            <div className="mt-3 pt-3 border-t border-surface-700/50">
              <p className="text-text-primary text-sm mb-2">
                차단하면 이 요청이 종료됩니다. 차단 시 환불되지 않습니다.
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
                  {isPending ? '처리 중...' : '차단'}
                </button>
              </div>
            </div>
          )}
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
              응답 없으면 <ExpiryText expiresAt={room.request_expires_at} /> 후 자동 만료 · 전액 환불
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
                취소하면 상대방이 차단되며 포인트는 환불되지 않습니다.
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

      {/* 종료/차단된 방 안내 (입력 잠금이 아닌 상단 배너) */}
      {!isPending2 && !isAgreed && !isLocked && (
        <div className="px-4 py-3 border-b border-surface-700/60 bg-surface-750/50">
          <p className="text-text-muted text-sm text-center">
            {statusLabel[room.status] ?? '종료된 대화'}
          </p>
        </div>
      )}

      {/* 메시지 목록: 스크롤만, 우측 여백 최소화(말풍선 붙임), 하단 여백 = 입력창+네비 (BottomNav 위 고정) */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pl-4 pr-1 py-4 pb-40 space-y-3">
        {localMessages.length === 0 && isAgreed && (
          <p className="text-center text-text-muted text-sm py-8">
            대화를 시작해보세요
          </p>
        )}
        {(() => {
          const firstUserMsgIndex = localMessages.findIndex((m) => m.message_type !== 'system')
          return localMessages.map((msg, index) => {
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
          const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : ''
          const prevMsg = index > 0 ? localMessages[index - 1] : null
          const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at).toDateString() : ''
          const showDateDivider = index === firstUserMsgIndex || msgDate !== prevDate

          return (
            <div key={msg.id} className="space-y-1">
              {showDateDivider && (
                <div className="flex justify-center py-2">
                  <span className="px-3 py-1 rounded-full bg-surface-750/80 text-text-muted text-[11px]">
                    {formatDateDivider(msg.created_at)}
                  </span>
                </div>
              )}
              <div
                className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
              >
                {isMine && (
                  <span className="flex-shrink-0 self-center mr-1 text-text-muted" title={msg.read_at ? '읽음' : '전송됨'}>
                    {msg.read_at ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                        <polyline points="20 12 9 23 4 18" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                )}
                <div className={`w-fit max-w-[70vw] flex-shrink-0 flex-grow-0 flex flex-col items-end gap-0.5 ${!isMine ? 'items-start' : ''}`}>
                  <div
                    className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed overflow-hidden
                                ${(msg.image_url || msg.message_type === 'image')
                                  ? 'w-full max-w-[280px]'
                                  : 'w-max max-w-[70vw]'
                                }
                                ${isMine
                                  ? 'bg-desire-500/20 text-text-primary rounded-br-sm'
                                  : 'bg-surface-750 text-text-primary rounded-bl-sm border border-surface-700/50'
                                }
                                ${isDeleted ? 'opacity-40 italic' : ''}`}
                  >
                    {isDeleted ? (
                      '삭제된 메시지입니다'
                    ) : (msg.image_url || msg.message_type === 'image') ? (
                      <div className="space-y-1.5">
                        <button
                          type="button"
                          onClick={() => setLightboxImageUrl(msg.image_url!)}
                          className="block rounded-xl overflow-hidden bg-surface-800 w-full text-left"
                          aria-label="이미지 크게 보기"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={msg.image_url!}
                            alt=""
                            className="w-full max-h-64 object-cover"
                          />
                        </button>
                        {msg.content?.trim() ? <p className="break-words text-sm leading-relaxed">{msg.content}</p> : null}
                      </div>
                    ) : (
                      <span className="break-words">{msg.content}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted px-1" title={formatFullDateTime(msg.created_at)}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          )
          })
        })()}
        <div ref={bottomRef} />
      </div>

      {/* 에러 */}
      {localError && (
        <div className="px-4 py-2 border-t border-surface-700/60 bg-bg-900">
          <p className="text-state-danger text-xs">{localError}</p>
        </div>
      )}

      {/* 차단/신고로 잠긴 경우: 입력 대신 안내 문구 */}
      {isLocked && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-md border-t border-surface-700/60 bg-bg-900 z-10 pb-[env(safe-area-inset-bottom,0px)]"
          style={{ bottom: 0 }}
        >
          <div className="px-4 py-4 text-center">
            <p className="text-text-muted text-sm">더이상 대화할수없는 상대입니다.</p>
          </div>
        </div>
      )}

      {/* 입력창: 채팅방에서는 네비 숨김 → 화면 맨 아래 고정, 스크롤 없이 항상 보임 */}
      {isAgreed && !showBlockConfirm && !isLocked && (
        <div
          className="fixed left-1/2 -translate-x-1/2 w-full max-w-md border-t border-surface-700/60 bg-bg-900 z-10 pb-[env(safe-area-inset-bottom,0px)]"
          style={{ bottom: 0 }}
        >
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageSelect}
            className="hidden"
            aria-hidden
          />

          {/* 카톡처럼: 이미지 선택 시 미리보기 + 캡션 입력 후 전송 */}
          {pendingImage ? (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-end gap-2">
                <div className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-800 border border-surface-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pendingImage.previewUrl}
                    alt="미리보기"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={clearPendingImage}
                    className="absolute top-0.5 right-0.5 w-6 h-6 rounded-full bg-black/60
                               flex items-center justify-center text-white hover:bg-black/80
                               active:opacity-80 transition-opacity"
                    aria-label="이미지 제거"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                <textarea
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="메시지를 입력하세요 (선택)"
                  rows={1}
                  maxLength={1000}
                  className="flex-1 bg-surface-750 text-text-primary text-sm px-4 py-3
                             rounded-2xl border border-surface-700/50 resize-none
                             placeholder:text-text-muted focus:outline-none
                             focus:border-surface-600 transition-colors"
                  style={{ maxHeight: 80, overflowY: 'auto' }}
                />
                <button
                  type="button"
                  onClick={clearPendingImage}
                  className="flex-shrink-0 py-2.5 px-3 rounded-xl text-text-muted text-sm
                             bg-surface-750 border border-surface-700 active:bg-surface-700"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => sendPendingImage()}
                  disabled={isPending || isUploadingImage}
                  className="flex-shrink-0 w-10 h-10 rounded-full bg-desire-500 flex items-center
                             justify-center active:bg-desire-400 disabled:opacity-40"
                  title={isUploadingImage ? '업로드 중...' : '전송'}
                >
                  {isUploadingImage ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-text-muted text-[11px] px-1">
                {isUploadingImage ? '업로드 중...' : '이미지를 확인한 뒤 전송하세요. 캡션은 선택입니다.'}
              </p>
            </div>
          ) : (
            <div className="px-4 py-3 flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-surface-750 border border-surface-700 flex items-center justify-center text-text-muted active:bg-surface-700 transition-colors"
                aria-label="이미지 첨부"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
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
                onClick={() => handleSend()}
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
      )}

      {/* 차단 확인 모달 (agreed 상태) — 고정 영역 위에 표시 */}
      {showBlockConfirm && isAgreed && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40">
          <div className="w-full max-w-md bg-surface-800 border-t border-surface-700 rounded-t-2xl px-4 py-4 safe-area-pb">
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
        </div>
      )}
    </div>

      {/* DM 이미지 라이트박스: 배경 클릭 시 닫기 */}
      {mounted && lightboxImageUrl && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 미리보기"
          className="fixed inset-0 z-[300] flex items-center justify-center
                     bg-black/92 backdrop-blur-sm"
          onClick={() => setLightboxImageUrl(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImageUrl}
            alt=""
            className="max-w-full max-h-[88vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            aria-label="닫기"
            className="absolute top-5 right-5 w-9 h-9 rounded-full
                       bg-white/10 hover:bg-white/20 active:bg-white/30
                       flex items-center justify-center transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>,
        document.body
      )}
    </>
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

/** 날짜 구분 라벨 (오늘, 어제, 2024. 3. 1.) */
function formatDateDivider(createdAt: string): string {
  const d = new Date(createdAt)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (dDate.getTime() === today.getTime()) return '오늘'
  if (dDate.getTime() === yesterday.getTime()) return '어제'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

/** 메시지 시간 (오후 3:42) */
function formatMessageTime(createdAt: string): string {
  return new Date(createdAt).toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/** 툴팁용 전체 날짜·시간 */
function formatFullDateTime(createdAt: string): string {
  return new Date(createdAt).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
