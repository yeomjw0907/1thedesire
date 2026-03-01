// 욕망백서 핵심 타입 정의
// 기준 문서: supabase-sql-v0.1.md, api-contracts-v0.1.md

export type Gender = 'male' | 'female' | 'other'

export type AccountStatus = 'active' | 'restricted' | 'suspended' | 'banned'

export type GenderBenefitType = 'standard' | 'female_starter'

export type PostStatus = 'draft' | 'published' | 'hidden' | 'deleted'

export type ChatRoomStatus = 'pending' | 'agreed' | 'declined' | 'expired' | 'blocked' | 'closed'

export type RefundPolicy = 'decline_half_refund' | 'expire_full_refund' | 'blocked_no_refund'

export type ConsentEventType =
  | 'request_created'
  | 'request_viewed'
  | 'agreement_accepted'
  | 'agreement_declined'
  | 'request_expired'
  | 'blocked'

export type MessageStatus = 'active' | 'deleted' | 'flagged'

export type PointTransactionType = 'signup_bonus' | 'charge' | 'debit' | 'refund' | 'manual_adjustment'

export type PolicyCode =
  | 'signup_bonus_female'
  | 'dm_request_cost'
  | 'dm_decline_refund_half'
  | 'dm_expire_refund_full'
  | 'manual_adjustment'
  | 'charge'

// DB Row Types
export interface Profile {
  id: string
  nickname: string
  gender: Gender
  age_group: string
  region: string
  role: string
  bio: string
  points: number
  gender_benefit_type: GenderBenefitType
  is_adult_checked: boolean
  adult_checked_at: string | null
  account_status: AccountStatus
  reported_count: number
  blocked_count: number
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  image_url: string | null
  tags: string | null
  is_auto_generated: boolean
  status: PostStatus
  created_at: string
  updated_at: string
}

export interface PointTransaction {
  id: string
  user_id: string
  type: PointTransactionType
  amount: number
  balance_after: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  policy_code: PolicyCode
  created_at: string
}

// API Response Types (api-contracts-v0.1.md 기준)
export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: ApiError | null
}

export interface ApiError {
  code: string
  message: string
}

// Signup
export interface SignupInput {
  nickname: string
  gender: Gender
  age_group: string
  region: string
  role: string
  bio: string
  is_adult_checked: boolean
  terms_agreed: boolean
}

export interface SignupResult {
  profile_id: string
  points: number
  auto_post_id: string | null
  is_female: boolean
}

// 포인트 정책 상수 (문서 고정값 - 임의 변경 금지)
export const POINTS = {
  FEMALE_SIGNUP_BONUS: 270,
  DM_REQUEST_COST: 90,
  DM_DECLINE_REFUND: 45,
  DM_EXPIRE_REFUND: 90,
} as const
