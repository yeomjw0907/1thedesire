'use server'

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { SignupInput, ApiResponse, SignupResult } from '@/types'

// 포인트 정책 상수 (문서 고정값 - 임의 변경 금지)
// 기준: key-decisions-summary-v0.1.md, state-based-functional-spec-v0.1.md
const FEMALE_SIGNUP_BONUS = 270

// 지역 목록
export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '해외',
] as const

// 연령대 목록
export const AGE_GROUPS = [
  '20대 초반', '20대 후반', '30대 초반', '30대 후반', '40대 이상',
] as const

/**
 * completeSignup
 * 기준 문서: api-contracts-v0.1.md §4
 *
 * 처리 순서:
 * 1. 인증 확인
 * 2. 입력값 검증
 * 3. 프로필 중복 확인 (idempotency)
 * 4. 닉네임 중복 확인
 * 5. 프로필 생성
 * 6. 여성일 경우 270P 지급 + point_transactions 기록
 * 7. 자동 소개글(post) 생성
 * 8. 성공 → /signup/complete 리디렉션
 *
 * 주의: service_role 클라이언트 사용으로 RLS 우회
 * 이유: 프로필 생성 + 포인트 지급 + 소개글 생성을 최대한 원자적으로 처리
 */
export async function completeSignup(
  _prevState: ApiResponse<SignupResult> | null,
  formData: FormData
): Promise<ApiResponse<SignupResult>> {
  // 1. 현재 로그인한 사용자 확인
  const supabase = await createServerClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      success: false,
      data: null,
      error: { code: 'UNAUTHORIZED', message: '로그인이 필요합니다.' },
    }
  }

  // 2. 입력값 파싱 및 검증
  const input: SignupInput = {
    nickname: (formData.get('nickname') as string)?.trim() ?? '',
    gender: (formData.get('gender') as SignupInput['gender']) ?? 'other',
    age_group: (formData.get('age_group') as string) ?? '',
    region: (formData.get('region') as string) ?? '',
    role: (formData.get('role') as string)?.trim() ?? '',
    bio: (formData.get('bio') as string)?.trim() ?? '',
    is_adult_checked: formData.get('is_adult_checked') === 'true',
    terms_agreed: formData.get('terms_agreed') === 'true',
  }

  const validationError = validateSignupInput(input)
  if (validationError) {
    return { success: false, data: null, error: validationError }
  }

  const admin = createAdminClient()

  const autoPostContent = generateAutoPost(input)

  // RPC: 프로필 생성 + 포인트 지급 + 자동 게시글을 하나의 트랜잭션으로
  const { data: result, error: rpcErr } = await admin.rpc('complete_signup_atomic', {
    p_user_id: user.id,
    p_nickname: input.nickname,
    p_gender: input.gender,
    p_age_group: input.age_group,
    p_region: input.region,
    p_role: input.role,
    p_bio: input.bio,
    p_auto_post_content: autoPostContent,
  })

  if (rpcErr) {
    const msg = rpcErr.message ?? ''
    if (msg.includes('ALREADY_EXISTS')) redirect('/home')
    if (msg.includes('NICKNAME_TAKEN')) {
      return {
        success: false,
        data: null,
        error: { code: 'NICKNAME_TAKEN', message: '이미 사용 중인 이름입니다. 다른 이름으로 조정해 주세요.' },
      }
    }
    console.error('[completeSignup] RPC 실패:', rpcErr)
    return {
      success: false,
      data: null,
      error: { code: 'PROFILE_CREATE_FAILED', message: '가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.' },
    }
  }

  const isFemale = result?.is_female ?? false
  const initialPoints = result?.initial_points ?? 0

  const params = new URLSearchParams({
    female: isFemale ? '1' : '0',
    points: String(initialPoints),
  })
  redirect(`/signup/complete?${params.toString()}`)
}

/**
 * 입력값 검증
 */
function validateSignupInput(input: SignupInput): { code: string; message: string } | null {
  if (!input.nickname) {
    return { code: 'NICKNAME_REQUIRED', message: '아직 입력하지 않은 정보가 있습니다.' }
  }
  if (input.nickname.length < 2 || input.nickname.length > 20) {
    return { code: 'NICKNAME_LENGTH', message: '닉네임은 2자 이상 20자 이하로 입력해 주세요.' }
  }
  if (!['male', 'female', 'other'].includes(input.gender)) {
    return { code: 'GENDER_REQUIRED', message: '아직 입력하지 않은 정보가 있습니다.' }
  }
  if (!input.age_group) {
    return { code: 'AGE_GROUP_REQUIRED', message: '아직 입력하지 않은 정보가 있습니다.' }
  }
  if (!input.region) {
    return { code: 'REGION_REQUIRED', message: '아직 입력하지 않은 정보가 있습니다.' }
  }
  if (!input.role) {
    return { code: 'ROLE_REQUIRED', message: '아직 입력하지 않은 정보가 있습니다.' }
  }
  if (!['Dom', 'Sub', 'Switch'].includes(input.role)) {
    return { code: 'ROLE_INVALID', message: '성향을 선택해 주세요.' }
  }
  if (!input.bio) {
    return {
      code: 'BIO_REQUIRED',
      message: '한두 문장만으로도 괜찮습니다. 대화를 시작하기 전에 보여주고 싶은 분위기를 적어주세요.',
    }
  }
  if (!input.is_adult_checked) {
    return { code: 'ADULT_CHECK_REQUIRED', message: '가입을 완료하려면 필수 동의가 필요합니다.' }
  }
  if (!input.terms_agreed) {
    return { code: 'TERMS_REQUIRED', message: '가입을 완료하려면 필수 동의가 필요합니다.' }
  }
  return null
}

/**
 * 자동 소개글 생성
 * 사용자의 자기소개와 성향을 기반으로 첫 게시글 작성
 */
function generateAutoPost(input: SignupInput): string {
  const lines: string[] = []

  if (input.bio) {
    lines.push(input.bio)
  }

  if (input.role) {
    lines.push(`\n성향: ${input.role}`)
  }

  return lines.join('')
}

/**
 * Google OAuth 로그인 시작
 */
export async function signInWithGoogle() {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  })

  if (error || !data.url) {
    return {
      success: false,
      data: null,
      error: { code: 'OAUTH_ERROR', message: '로그인 중 오류가 발생했습니다.' },
    }
  }

  redirect(data.url)
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}
