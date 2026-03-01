# Vercel + Supabase 배포 설정 가이드

도메인: https://1thedesire.com
Supabase 프로젝트: yoloxrvdalqeywatulhp

---

## 1. Supabase 설정 (먼저 해야 함)

### 1-1. 마이그레이션 실행

1. https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp/sql/new 접속
2. `supabase/migrations/` 폴더의 SQL 파일들을 **순서대로** 붙여넣기 후 실행

| 순서 | 파일명 |
|------|--------|
| 1 | 202602280001_extensions_and_helpers.sql |
| 2 | 202602280002_create_profiles.sql |
| 3 | 202602280003_create_posts.sql |
| 4 | 202602280004_create_blocks.sql |
| 5 | 202602280005_create_chat_rooms.sql |
| 6 | 202602280006_create_consent_events.sql |
| 7 | 202602280007_create_messages.sql |
| 8 | 202602280008_create_point_transactions.sql |
| 9 | 202602280009_create_payment_events.sql |
| 10 | 202602280010_create_reports.sql |
| 11 | 202602280011_create_moderation_actions.sql |
| 12 | 202602280013_enable_rls.sql |
| 13 | 202602280014_profiles_policies.sql |
| 14 | 202602280015_posts_policies.sql |
| 15 | 202602280016_chat_and_messages_policies.sql |
| 16 | 202602280017_points_reports_admin_policies.sql |
| 17 | 202602280018_storage_post_images.sql |

> 오류가 나도 대부분 "이미 존재" 오류이므로 계속 진행 가능

### 1-2. Auth → URL Configuration 설정

https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp/auth/url-configuration

| 항목 | 값 |
|------|-----|
| Site URL | `https://1thedesire.com` |
| Redirect URLs (추가) | `https://1thedesire.com/auth/callback` |
| Redirect URLs (추가) | `http://localhost:3001/auth/callback` |

### 1-3. Google OAuth 설정

https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp/auth/providers

1. **Google** 항목 클릭 → Enable 토글 ON
2. Google Cloud Console (https://console.cloud.google.com) 에서:
   - 새 프로젝트 생성 또는 기존 프로젝트 선택
   - APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs에 추가:
     ```
     https://yoloxrvdalqeywatulhp.supabase.co/auth/v1/callback
     ```
3. 발급된 **Client ID**와 **Client Secret**을 Supabase Google provider에 입력

### 1-4. Realtime 활성화

https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp/database/replication

- `messages` 테이블의 **INSERT** 이벤트 Realtime 활성화

또는 SQL로:
```sql
alter publication supabase_realtime add table messages;
```

---

## 2. Vercel 배포

### 2-1. 프로젝트 연결

1. https://vercel.com/new 접속
2. GitHub에서 `yeomjw0907/1thedesire` 레포 선택
3. Framework: **Next.js** (자동 감지)
4. Root Directory: `.` (기본값)

### 2-2. 환경변수 설정

Vercel 대시보드 → Settings → Environment Variables에 아래 항목 추가:

| 키 | 값 | 환경 |
|----|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yoloxrvdalqeywatulhp.supabase.co` | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local`의 ANON_KEY 값 | All |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`의 SERVICE_ROLE_KEY 값 | All |
| `NEXT_PUBLIC_APP_URL` | `https://1thedesire.com` | Production |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` | Development |
| `ADMIN_EMAILS` | 관리자 이메일 (쉼표로 구분) | All |
| `CRON_SECRET` | 랜덤 문자열 (openssl rand -hex 32) | All |

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사 없이 유지

### 2-3. 커스텀 도메인 설정

1. Vercel 대시보드 → Domains → Add Domain
2. `1thedesire.com` 입력
3. 도메인 registrar에서 DNS 설정:
   - **A 레코드**: `@` → `76.76.21.21`
   - 또는 **CNAME**: `www` → `cname.vercel-dns.com`
4. SSL은 Vercel이 자동 발급 (Let's Encrypt)

### 2-4. Cron Job 활성화

`vercel.json`이 이미 설정됨:
```json
{
  "crons": [{ "path": "/api/cron/expire-dm", "schedule": "0 * * * *" }]
}
```

- **Pro 플랜** 이상에서만 Cron이 동작 (Hobby 플랜은 수동 호출만 가능)
- CRON_SECRET 환경변수를 반드시 설정할 것

Vercel 대시보드 → Settings → Crons 탭에서 실행 로그 확인 가능

---

## 3. 배포 후 확인 체크리스트

- [ ] https://1thedesire.com 접속 → 홈 피드 로딩
- [ ] Google 로그인 작동 확인
- [ ] 가입 폼 제출 → 프로필 생성 + 포인트 지급 확인
- [ ] 게시글 작성 (이미지 포함)
- [ ] 다른 계정으로 DM 요청 → 수락 → 메시지 전송
- [ ] Realtime 메시지 수신 (두 개의 브라우저 탭에서 테스트)
- [ ] 포인트 내역 조회
- [ ] 어드민 페이지 접속 (/admin)
- [ ] Cron 수동 테스트:
  ```bash
  curl -X POST https://1thedesire.com/api/cron/expire-dm \
    -H "Authorization: Bearer {CRON_SECRET}"
  ```

---

## 4. 운영 이메일 설정 (선택)

충전 문의용 이메일 `support@1thedesire.com` 필요 시:
- Google Workspace 또는 Resend (https://resend.com) 연동
- Supabase Auth 이메일 템플릿 커스터마이징:
  https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp/auth/templates

---

## 5. 모니터링

| 서비스 | URL |
|--------|-----|
| Vercel 배포 로그 | https://vercel.com/yeomjw0907/1thedesire |
| Supabase DB | https://supabase.com/dashboard/project/yoloxrvdalqeywatulhp |
| Supabase Auth 로그 | .../auth/users |
| Supabase Storage | .../storage/buckets |
