// 최근 STI 검사 확인 기능 타입 정의
// 기준 문서: sti-verification-feature-spec-v0.1.md

export type StiBadgeStatus =
  | 'none'
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'expired'
  | 'revoked'

export type StiSubmissionStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'deleted'

export type StiAuditActionType =
  | 'submission_created'
  | 'submission_opened'
  | 'submission_approved'
  | 'submission_rejected'
  | 'badge_visibility_updated'
  | 'badge_revoked'
  | 'badge_expired'
  | 'source_file_deleted'

// DB Row Types

export interface StiCheckBadge {
  user_id: string
  verification_status: StiBadgeStatus
  test_date: string | null
  expires_at: string | null
  verified_at: string | null
  verification_method: string | null
  is_public: boolean
  revoked_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

export interface StiCheckSubmission {
  id: string
  user_id: string
  status: StiSubmissionStatus
  test_date: string
  file_path: string | null
  submitted_at: string
  reviewed_at: string | null
  reviewer_id: string | null
  review_note: string | null
  expires_at: string | null
  created_at: string
}

export interface StiCheckAuditLog {
  id: string
  user_id: string
  submission_id: string | null
  actor_id: string | null
  action_type: StiAuditActionType
  metadata: Record<string, unknown>
  created_at: string
}

// 공개 배지 최소 정보 (public_sti_badges view)
export interface PublicStiBadge {
  user_id: string
  test_date: string | null
  expires_at: string | null
  verified_at: string | null
}

// Action Input Types

export interface CreateStiSubmissionInput {
  test_date: string
  file: File
  consent_sensitive: boolean
  consent_public: boolean
}

export interface ApproveStiSubmissionInput {
  submission_id: string
  expires_at: string
  review_note?: string
}

export interface RejectStiSubmissionInput {
  submission_id: string
  review_note: string
}
