'use server'

import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ApiResponse } from '@/types'
import type {
  StiCheckBadge,
  StiCheckSubmission,
  StiAuditActionType,
  ApproveStiSubmissionInput,
  RejectStiSubmissionInput,
} from '@/types/sti'

// ─────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────

async function getAuthUser(): Promise<{ userId: string } | ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }
  return { userId: user.id }
}

async function checkAdmin(): Promise<{ userId: string } | ApiResponse> {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return { success: false, data: null, error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다' } }
  }

  // RBAC: DB is_admin 우선, 폴백으로 ADMIN_EMAILS 환경변수 (admin.ts와 동일 패턴)
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  const isDbAdmin = profile?.is_admin === true
  const adminEmails = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim())
  const isEnvAdmin = adminEmails.includes(user.email ?? '')

  if (!isDbAdmin && !isEnvAdmin) {
    return { success: false, data: null, error: { code: 'FORBIDDEN', message: '권한이 없습니다' } }
  }
  return { userId: user.id }
}

function isApiResponse(v: unknown): v is ApiResponse {
  return typeof v === 'object' && v !== null && 'success' in v
}

async function insertAuditLog(
  adminClient: ReturnType<typeof createAdminClient>,
  params: {
    user_id: string
    submission_id?: string | null
    actor_id: string
    action_type: StiAuditActionType
    metadata?: Record<string, unknown>
  }
) {
  await adminClient.from('sti_check_audit_logs').insert({
    user_id: params.user_id,
    submission_id: params.submission_id ?? null,
    actor_id: params.actor_id,
    action_type: params.action_type,
    metadata: params.metadata ?? {},
  })
}

// ─────────────────────────────────────────────
// 1. 사용자: 제출 생성
// ─────────────────────────────────────────────

export async function createStiVerificationSubmission(
  formData: FormData
): Promise<ApiResponse<{ submission_id: string; status: string }>> {
  const auth = await getAuthUser()
  if (isApiResponse(auth)) return auth as ApiResponse<{ submission_id: string; status: string }>

  const test_date = formData.get('test_date') as string
  const file = formData.get('file') as File | null
  const consent_sensitive = formData.get('consent_sensitive') === 'true'
  const consent_public = formData.get('consent_public') === 'true'

  if (!test_date) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '검사일을 입력해주세요' } }
  }
  if (!file || file.size === 0) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '파일을 첨부해주세요' } }
  }
  if (!consent_sensitive) {
    return { success: false, data: null, error: { code: 'INVALID_INPUT', message: '민감정보 수집·이용 동의가 필요합니다' } }
  }
  if (file.size > 10 * 1024 * 1024) {
    return { success: false, data: null, error: { code: 'FILE_TOO_LARGE', message: '파일 크기는 10MB 이하여야 합니다' } }
  }

  const admin = createAdminClient()

  // 중복 제출 검사
  const { data: existing } = await admin
    .from('sti_check_submissions')
    .select('id, status')
    .eq('user_id', auth.userId)
    .in('status', ['pending', 'under_review'])
    .maybeSingle()

  if (existing) {
    return {
      success: false,
      data: null,
      error: { code: 'DUPLICATE_SUBMISSION', message: '현재 검수 중인 요청이 있습니다. 처리 완료 후 재제출할 수 있습니다.' },
    }
  }

  // submission row 먼저 생성 (파일 경로는 나중에 업데이트)
  const { data: submission, error: subError } = await admin
    .from('sti_check_submissions')
    .insert({
      user_id: auth.userId,
      status: 'pending',
      test_date,
    })
    .select('id')
    .single()

  if (subError || !submission) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '제출 생성에 실패했습니다' } }
  }

  // 파일 업로드: sti-verification-private/{user_id}/{submission_id}/{uuid}.ext
  const ext = file.name.split('.').pop() ?? 'bin'
  const filePath = `${auth.userId}/${submission.id}/${crypto.randomUUID()}.${ext}`

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from('sti-verification-private')
    .upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    // 파일 업로드 실패 시 submission 삭제
    await admin.from('sti_check_submissions').delete().eq('id', submission.id)
    return { success: false, data: null, error: { code: 'UPLOAD_ERROR', message: '파일 업로드에 실패했습니다. 다시 시도해주세요.' } }
  }

  // file_path 업데이트
  await admin
    .from('sti_check_submissions')
    .update({ file_path: filePath })
    .eq('id', submission.id)

  // badge upsert: pending 상태로
  await admin
    .from('sti_check_badges')
    .upsert({
      user_id: auth.userId,
      verification_status: 'pending',
      test_date,
      is_public: consent_public,
      rejection_reason: null,
      revoked_at: null,
    }, { onConflict: 'user_id' })

  // audit log
  await insertAuditLog(admin, {
    user_id: auth.userId,
    submission_id: submission.id,
    actor_id: auth.userId,
    action_type: 'submission_created',
    metadata: { test_date, consent_public },
  })

  return { success: true, data: { submission_id: submission.id, status: 'pending' }, error: null }
}

// ─────────────────────────────────────────────
// 2. 사용자: 공개 여부 변경
// ─────────────────────────────────────────────

export async function setStiBadgeVisibility(
  is_public: boolean
): Promise<ApiResponse> {
  const auth = await getAuthUser()
  if (isApiResponse(auth)) return auth

  const admin = createAdminClient()

  // verified 상태 확인
  const { data: badge } = await admin
    .from('sti_check_badges')
    .select('verification_status, is_public')
    .eq('user_id', auth.userId)
    .single()

  if (!badge) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '검사 확인 정보가 없습니다' } }
  }
  if (badge.verification_status !== 'verified') {
    return { success: false, data: null, error: { code: 'INVALID_STATE', message: '검증 완료 상태에서만 공개 설정을 변경할 수 있습니다' } }
  }

  const { error } = await admin
    .from('sti_check_badges')
    .update({ is_public })
    .eq('user_id', auth.userId)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '공개 설정 변경에 실패했습니다' } }
  }

  await insertAuditLog(admin, {
    user_id: auth.userId,
    actor_id: auth.userId,
    action_type: 'badge_visibility_updated',
    metadata: { is_public },
  })

  return { success: true, data: null, error: null }
}

// ─────────────────────────────────────────────
// 3. 사용자: 철회
// ─────────────────────────────────────────────

export async function revokeStiVerification(
  reason?: string
): Promise<ApiResponse> {
  const auth = await getAuthUser()
  if (isApiResponse(auth)) return auth

  const admin = createAdminClient()

  const { data: badge } = await admin
    .from('sti_check_badges')
    .select('verification_status')
    .eq('user_id', auth.userId)
    .single()

  if (!badge || badge.verification_status === 'none') {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '검사 확인 정보가 없습니다' } }
  }

  const { error } = await admin
    .from('sti_check_badges')
    .update({
      verification_status: 'revoked',
      is_public: false,
      revoked_at: new Date().toISOString(),
    })
    .eq('user_id', auth.userId)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '철회 처리에 실패했습니다' } }
  }

  await insertAuditLog(admin, {
    user_id: auth.userId,
    actor_id: auth.userId,
    action_type: 'badge_revoked',
    metadata: { reason: reason ?? '' },
  })

  return { success: true, data: null, error: null }
}

// ─────────────────────────────────────────────
// 4. 관리자: 제출 목록 조회
// ─────────────────────────────────────────────

export async function getAdminStiSubmissions(
  statusFilter?: string
): Promise<ApiResponse<StiCheckSubmission[]>> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check as ApiResponse<StiCheckSubmission[]>

  const admin = createAdminClient()

  let query = admin
    .from('sti_check_submissions')
    .select('*')
    .order('submitted_at', { ascending: true })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  } else {
    query = query.in('status', ['pending', 'under_review'])
  }

  const { data, error } = await query.limit(50)

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '목록 조회에 실패했습니다' } }
  }

  return { success: true, data: data as StiCheckSubmission[], error: null }
}

// ─────────────────────────────────────────────
// 5. 관리자: 제출 상세 조회 + under_review 전환
// ─────────────────────────────────────────────

export async function openStiSubmissionForReview(
  submissionId: string
): Promise<ApiResponse<{ submission: StiCheckSubmission; badge: StiCheckBadge | null; signedUrl: string | null }>> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check as ApiResponse<{ submission: StiCheckSubmission; badge: StiCheckBadge | null; signedUrl: string | null }>

  const admin = createAdminClient()

  const { data: submission, error: subError } = await admin
    .from('sti_check_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (subError || !submission) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '제출을 찾을 수 없습니다' } }
  }

  // pending이면 under_review로 전환
  if (submission.status === 'pending') {
    await admin
      .from('sti_check_submissions')
      .update({ status: 'under_review' })
      .eq('id', submissionId)

    await admin
      .from('sti_check_badges')
      .update({ verification_status: 'under_review' })
      .eq('user_id', submission.user_id)

    await insertAuditLog(admin, {
      user_id: submission.user_id,
      submission_id: submissionId,
      actor_id: check.userId,
      action_type: 'submission_opened',
      metadata: {},
    })
  }

  const [badgeRes, urlRes] = await Promise.all([
    admin.from('sti_check_badges').select('*').eq('user_id', submission.user_id).single(),
    submission.file_path
      ? admin.storage.from('sti-verification-private').createSignedUrl(submission.file_path, 300)
      : Promise.resolve({ data: { signedUrl: null } }),
  ])
  const badge = badgeRes.data
  const signedUrl = urlRes.data?.signedUrl ?? null

  return {
    success: true,
    data: {
      submission: submission as StiCheckSubmission,
      badge: badge as StiCheckBadge | null,
      signedUrl,
    },
    error: null,
  }
}

// ─────────────────────────────────────────────
// 6. 관리자: 승인
// ─────────────────────────────────────────────

export async function approveStiVerificationSubmission(
  input: ApproveStiSubmissionInput
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  const admin = createAdminClient()

  const { data: submission } = await admin
    .from('sti_check_submissions')
    .select('id, user_id, test_date, file_path, status')
    .eq('id', input.submission_id)
    .single()

  if (!submission) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '제출을 찾을 수 없습니다' } }
  }
  if (!['pending', 'under_review'].includes(submission.status)) {
    return { success: false, data: null, error: { code: 'INVALID_STATE', message: '처리할 수 없는 상태입니다' } }
  }

  const now = new Date().toISOString()

  // submission approved
  const { error: subErr } = await admin
    .from('sti_check_submissions')
    .update({
      status: 'approved',
      reviewed_at: now,
      reviewer_id: check.userId,
      review_note: input.review_note ?? null,
      expires_at: input.expires_at,
    })
    .eq('id', input.submission_id)

  if (subErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '승인 처리에 실패했습니다' } }
  }

  // badge verified
  await admin
    .from('sti_check_badges')
    .update({
      verification_status: 'verified',
      test_date: submission.test_date,
      verified_at: now,
      expires_at: input.expires_at,
      rejection_reason: null,
    })
    .eq('user_id', submission.user_id)

  await insertAuditLog(admin, {
    user_id: submission.user_id,
    submission_id: input.submission_id,
    actor_id: check.userId,
    action_type: 'submission_approved',
    metadata: { expires_at: input.expires_at, review_note: input.review_note ?? '' },
  })

  // 원본 파일 삭제
  if (submission.file_path) {
    const { error: deleteErr } = await admin.storage
      .from('sti-verification-private')
      .remove([submission.file_path])

    await insertAuditLog(admin, {
      user_id: submission.user_id,
      submission_id: input.submission_id,
      actor_id: check.userId,
      action_type: 'source_file_deleted',
      metadata: { success: !deleteErr, path: submission.file_path },
    })

    if (deleteErr) {
      // 삭제 실패 시 submission file_path를 null로만 업데이트하지 않음 (추적용 유지)
      // 실제 운영에서는 관리자 알림 필요
      console.error('[STI] 원본 파일 삭제 실패:', deleteErr)
    } else {
      await admin
        .from('sti_check_submissions')
        .update({ file_path: null })
        .eq('id', input.submission_id)
    }
  }

  return { success: true, data: null, error: null }
}

// ─────────────────────────────────────────────
// 7. 관리자: 반려
// ─────────────────────────────────────────────

export async function rejectStiVerificationSubmission(
  input: RejectStiSubmissionInput
): Promise<ApiResponse> {
  const check = await checkAdmin()
  if (isApiResponse(check)) return check

  const admin = createAdminClient()

  const { data: submission } = await admin
    .from('sti_check_submissions')
    .select('id, user_id, file_path, status')
    .eq('id', input.submission_id)
    .single()

  if (!submission) {
    return { success: false, data: null, error: { code: 'NOT_FOUND', message: '제출을 찾을 수 없습니다' } }
  }
  if (!['pending', 'under_review'].includes(submission.status)) {
    return { success: false, data: null, error: { code: 'INVALID_STATE', message: '처리할 수 없는 상태입니다' } }
  }

  const now = new Date().toISOString()

  const { error: subErr } = await admin
    .from('sti_check_submissions')
    .update({
      status: 'rejected',
      reviewed_at: now,
      reviewer_id: check.userId,
      review_note: input.review_note,
    })
    .eq('id', input.submission_id)

  if (subErr) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '반려 처리에 실패했습니다' } }
  }

  await admin
    .from('sti_check_badges')
    .update({
      verification_status: 'rejected',
      rejection_reason: input.review_note,
      is_public: false,
    })
    .eq('user_id', submission.user_id)

  await insertAuditLog(admin, {
    user_id: submission.user_id,
    submission_id: input.submission_id,
    actor_id: check.userId,
    action_type: 'submission_rejected',
    metadata: { review_note: input.review_note },
  })

  // 원본 파일 삭제
  if (submission.file_path) {
    const { error: deleteErr } = await admin.storage
      .from('sti-verification-private')
      .remove([submission.file_path])

    await insertAuditLog(admin, {
      user_id: submission.user_id,
      submission_id: input.submission_id,
      actor_id: check.userId,
      action_type: 'source_file_deleted',
      metadata: { success: !deleteErr, path: submission.file_path },
    })

    if (!deleteErr) {
      await admin
        .from('sti_check_submissions')
        .update({ file_path: null })
        .eq('id', input.submission_id)
    }
  }

  return { success: true, data: null, error: null }
}

// ─────────────────────────────────────────────
// 8. 사용자: 내 검증 상태만 조회 (프로필 페이지용)
// sti_check_badges에 sti_badges_select_own RLS 정책(user_id = auth.uid())이 적용돼 있어
// 일반 server client로 안전하게 조회 가능. admin client 불필요.
// ─────────────────────────────────────────────

export type StiVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'revoked'
  | 'none'

export async function getMyVerificationStatus(): Promise<StiVerificationStatus | null> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data, error } = await supabase
    .from('sti_check_badges')
    .select('verification_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[STI] getMyVerificationStatus 조회 실패:', error)
    return null
  }

  return (data?.verification_status as StiVerificationStatus) ?? null
}

// ─────────────────────────────────────────────
// 9. 사용자: 내 배지 상태 조회 (전체 row)
// ─────────────────────────────────────────────

export async function getMyStiBadge(): Promise<ApiResponse<StiCheckBadge | null>> {
  const auth = await getAuthUser()
  if (isApiResponse(auth)) return auth as ApiResponse<StiCheckBadge | null>

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sti_check_badges')
    .select('*')
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '조회에 실패했습니다' } }
  }

  return { success: true, data: data as StiCheckBadge | null, error: null }
}

// ─────────────────────────────────────────────
// 10. 사용자: 내 최근 제출 조회
// ─────────────────────────────────────────────

export async function getMyLatestStiSubmission(): Promise<ApiResponse<StiCheckSubmission | null>> {
  const auth = await getAuthUser()
  if (isApiResponse(auth)) return auth as ApiResponse<StiCheckSubmission | null>

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sti_check_submissions')
    .select('id, user_id, status, test_date, submitted_at, reviewed_at, review_note, expires_at, created_at')
    .eq('user_id', auth.userId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    return { success: false, data: null, error: { code: 'DB_ERROR', message: '조회에 실패했습니다' } }
  }

  return { success: true, data: data as StiCheckSubmission | null, error: null }
}
