'use client'

import { createContext, useContext, useReducer, useCallback } from 'react'

export interface LikeNotification {
  id: string
  actorId: string | null
  actorNickname: string
  postId: string
  createdAt: string
  read: boolean
}

/** 충전 완료/거절 등 시스템 알림 */
export interface SystemNotification {
  id: string
  type: 'charge_completed' | 'charge_rejected'
  message: string
  createdAt: string
  read: boolean
}

interface State {
  dmCount: number
  likeNotifications: LikeNotification[]
  systemNotifications: SystemNotification[]
}

type Action =
  | { type: 'INCREMENT_DM' }
  | { type: 'RESET_DM' }
  | { type: 'ADD_LIKE_NOTIFICATION'; payload: LikeNotification }
  | { type: 'SET_LIKE_NOTIFICATIONS'; payload: LikeNotification[] }
  | { type: 'MARK_ALL_LIKES_READ' }
  | { type: 'ADD_SYSTEM_NOTIFICATION'; payload: SystemNotification }
  | { type: 'SET_SYSTEM_NOTIFICATIONS'; payload: SystemNotification[] }
  | { type: 'MARK_ALL_SYSTEM_READ' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT_DM':
      return { ...state, dmCount: state.dmCount + 1 }
    case 'RESET_DM':
      return { ...state, dmCount: 0 }
    case 'ADD_LIKE_NOTIFICATION':
      return { ...state, likeNotifications: [action.payload, ...state.likeNotifications] }
    case 'SET_LIKE_NOTIFICATIONS':
      return { ...state, likeNotifications: action.payload }
    case 'MARK_ALL_LIKES_READ':
      return {
        ...state,
        likeNotifications: state.likeNotifications.map((n) => ({ ...n, read: true })),
      }
    case 'ADD_SYSTEM_NOTIFICATION':
      return { ...state, systemNotifications: [action.payload, ...state.systemNotifications] }
    case 'SET_SYSTEM_NOTIFICATIONS':
      return { ...state, systemNotifications: action.payload }
    case 'MARK_ALL_SYSTEM_READ':
      return {
        ...state,
        systemNotifications: state.systemNotifications.map((n) => ({ ...n, read: true })),
      }
    default:
      return state
  }
}

interface NotificationCtx extends State {
  incrementDm: () => void
  resetDm: () => void
  addLikeNotification: (n: LikeNotification) => void
  setLikeNotifications: (list: LikeNotification[]) => void
  markAllLikesRead: () => void
  addSystemNotification: (n: SystemNotification) => void
  setSystemNotifications: (list: SystemNotification[]) => void
  markAllSystemRead: () => void
  likeUnreadCount: number
  systemUnreadCount: number
  totalUnreadCount: number
}

const NotificationContext = createContext<NotificationCtx>({
  dmCount: 0,
  likeNotifications: [],
  systemNotifications: [],
  likeUnreadCount: 0,
  systemUnreadCount: 0,
  totalUnreadCount: 0,
  incrementDm: () => {},
  resetDm: () => {},
  addLikeNotification: () => {},
  setLikeNotifications: () => {},
  markAllLikesRead: () => {},
  addSystemNotification: () => {},
  setSystemNotifications: () => {},
  markAllSystemRead: () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    dmCount: 0,
    likeNotifications: [],
    systemNotifications: [],
  })

  const incrementDm = useCallback(() => dispatch({ type: 'INCREMENT_DM' }), [])
  const resetDm = useCallback(() => dispatch({ type: 'RESET_DM' }), [])
  const addLikeNotification = useCallback(
    (n: LikeNotification) => dispatch({ type: 'ADD_LIKE_NOTIFICATION', payload: n }),
    []
  )
  const setLikeNotifications = useCallback(
    (list: LikeNotification[]) => dispatch({ type: 'SET_LIKE_NOTIFICATIONS', payload: list }),
    []
  )
  const markAllLikesRead = useCallback(() => dispatch({ type: 'MARK_ALL_LIKES_READ' }), [])
  const addSystemNotification = useCallback(
    (n: SystemNotification) => dispatch({ type: 'ADD_SYSTEM_NOTIFICATION', payload: n }),
    []
  )
  const setSystemNotifications = useCallback(
    (list: SystemNotification[]) => dispatch({ type: 'SET_SYSTEM_NOTIFICATIONS', payload: list }),
    []
  )
  const markAllSystemRead = useCallback(() => dispatch({ type: 'MARK_ALL_SYSTEM_READ' }), [])

  const likeUnreadCount = state.likeNotifications.filter((n) => !n.read).length
  const systemUnreadCount = state.systemNotifications.filter((n) => !n.read).length
  const totalUnreadCount = likeUnreadCount + systemUnreadCount

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        incrementDm,
        resetDm,
        addLikeNotification,
        setLikeNotifications,
        markAllLikesRead,
        addSystemNotification,
        setSystemNotifications,
        markAllSystemRead,
        likeUnreadCount,
        systemUnreadCount,
        totalUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
