# 구글 + X(트위터) 소셜 로그인 연동 준비

로그인 화면에서 **Google** / **X로 시작하기** 버튼이 동작하도록 하기 위한 설정 체크리스트입니다.

---

## 1. 앱 코드 상태 (완료)

| 항목 | 상태 |
|------|------|
| 로그인 페이지 | `/login` — Google 버튼 + X 버튼 노출 |
| Google 로그인 | `GoogleLoginButton` → `signInWithOAuth({ provider: 'google' })` |
| X 로그인 | `TwitterLoginButton` → `signInWithOAuth({ provider: 'x' })` |
| 콜백 처리 | `/auth/callback` — 구글/X 공통, 프로필 유무에 따라 `/signup` 또는 `/home` |

추가로 수정할 코드는 없습니다. 아래만 설정하면 됩니다.

---

## 2. Supabase Dashboard

**경로**: [Supabase](https://supabase.com/dashboard) → 프로젝트 선택 → **Authentication** → **Providers**

### 2-1. Google

- **Google** 프로바이더 **Enable**.
- **Client ID**: Google Cloud Console에서 발급한 OAuth 2.0 클라이언트 ID.
- **Client Secret**: 위 클라이언트에 대한 Secret.

### 2-2. X (Twitter)

- **X (Twitter)** 프로바이더 **Enable**.
- **Client ID**: X Developer Portal에서 발급한 OAuth 2.0 Client ID.
- **Client Secret**: 위 앱의 Client Secret.

### 2-3. Redirect URL (공통)

**경로**: Authentication → **URL Configuration**

- **Site URL**: 실제 서비스 URL (예: `https://1thedesire.com` 또는 로컬 `http://localhost:3000`).
- **Redirect URLs**에 다음을 모두 추가:
  - `http://localhost:3000/auth/callback`
  - `https://1thedesire.com/auth/callback`  
  (배포 도메인이 다르면 해당 URL도 추가)

---

## 3. Google Cloud Console (구글 로그인용)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속.
2. 프로젝트 선택 또는 새 프로젝트 생성.
3. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**.
4. **Application type**: Web application.
5. **Authorized redirect URIs**에 Supabase 콜백 URL 추가:
   - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`  
   - `<PROJECT_REF>`는 Supabase 프로젝트 URL의 식별자 (예: `yoloxrvdalqeywatulhp`).
6. 생성된 **Client ID**와 **Client Secret**을 복사 → Supabase **Authentication → Providers → Google**에 입력.
7. **OAuth consent screen**에서 앱 이름·도메인 등 필수 정보 입력 (테스트/프로덕션 선택).

---

## 4. X Developer Portal (X 로그인용)

1. [X Developer Portal](https://developer.x.com/) 접속 → 로그인.
2. **Developer Portal** → **Projects & Apps** → 기존 앱 선택 또는 **Create App**.
3. 해당 앱에서 **User authentication settings** → **Set up**.
4. **OAuth 2.0** 사용 설정:
   - **App permissions**: Read (또는 필요한 범위만).
   - **Type of App**: Web App.
   - **Callback URI / Redirect URL**에 Supabase 콜백 등록:
     - `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   - **Website URL**: 서비스 URL (예: `https://1thedesire.com`).
5. 저장 후 **Client ID**와 **Client Secret** 확인 → Supabase **Authentication → Providers → X (Twitter)**에 입력.

---

## 5. Supabase 콜백 URL (이 프로젝트)

이 프로젝트의 Supabase 콜백 URL은 아래와 같습니다. **Google Cloud**와 **X Developer Portal**의 Redirect/Callback URI에 그대로 등록하세요.

```
https://yoloxrvdalqeywatulhp.supabase.co/auth/v1/callback
```

이 URL을 **Google Cloud Console**과 **X Developer Portal** 양쪽의 Redirect/Callback URI에 동일하게 등록해야 합니다.

---

## 6. 연동 준비 체크리스트

| 순서 | 작업 | 완료 |
|------|------|------|
| 1 | Supabase → URL Configuration에 Site URL·Redirect URLs 설정 | ☐ |
| 2 | Google Cloud Console에서 OAuth 클라이언트 생성, Redirect URI에 Supabase 콜백 등록 | ☐ |
| 3 | Supabase → Providers → Google Enable, Client ID/Secret 입력 | ☐ |
| 4 | X Developer Portal에서 앱·OAuth 2.0 설정, Callback URL에 Supabase 콜백 등록 | ☐ |
| 5 | Supabase → Providers → X (Twitter) Enable, Client ID/Secret 입력 | ☐ |
| 6 | 로컬/배포 환경에서 Google·X 버튼으로 로그인 테스트 | ☐ |

위 순서대로 진행하면 구글·X 소셜 로그인 연동 준비가 완료됩니다.
