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

interface State {
  dmCount: number
  likeNotifications: LikeNotification[]
}

type Action =
  | { type: 'INCREMENT_DM' }
  | { type: 'RESET_DM' }
  | { type: 'ADD_LIKE_NOTIFICATION'; payload: LikeNotification }
  | { type: 'SET_LIKE_NOTIFICATIONS'; payload: LikeNotification[] }
  | { type: 'MARK_ALL_LIKES_READ' }

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
  likeUnreadCount: number
}

const NotificationContext = createContext<NotificationCtx>({
  dmCount: 0,
  likeNotifications: [],
  likeUnreadCount: 0,
  incrementDm: () => {},
  resetDm: () => {},
  addLikeNotification: () => {},
  setLikeNotifications: () => {},
  markAllLikesRead: () => {},
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { dmCount: 0, likeNotifications: [] })

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

  const likeUnreadCount = state.likeNotifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{
        ...state,
        incrementDm,
        resetDm,
        addLikeNotification,
        setLikeNotifications,
        markAllLikesRead,
        likeUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
