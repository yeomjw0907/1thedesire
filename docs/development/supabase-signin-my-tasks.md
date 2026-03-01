# Supabase 로그인 설정 — 내가 할 일

Supabase 대시보드와 외부 서비스(Google, X)에서 **직접 설정해야 할 것**만 순서대로 정리했습니다.

---

## 1. Supabase 대시보드 들어가기

1. [Supabase](https://supabase.com/dashboard) 접속 후 로그인
2. **프로젝트 선택** (욕망백서용 프로젝트)
3. 왼쪽 메뉴에서 **Authentication** 클릭

---

## 2. Providers (Sign In / Providers) 설정

**경로**: Authentication → **Providers** (또는 **Sign In** 하위에 **Providers**)

### 2-1. Email 켜기

| 항목 | 할 일 |
|------|--------|
| **Email** | 토글 **Enable** 로 켜기 |
| 설명 | 이메일로 “로그인 링크 받기” 할 때 사용. 추가 입력 없이 켜기만 하면 됨. |

### 2-2. Google 켜기

| 항목 | 할 일 |
|------|--------|
| **Google** | 토글 **Enable** 로 켜기 |
| **Client ID** | Google Cloud Console에서 만든 OAuth 2.0 클라이언트의 **Client ID** 붙여넣기 |
| **Client Secret** | 같은 클라이언트의 **Client Secret** 붙여넣기 |
| **Save** | 저장 버튼 클릭 |

→ Client ID / Secret 발급 방법은 아래 **4. Google Cloud Console** 참고.

### 2-3. X (Twitter) 켜기

| 항목 | 할 일 |
|------|--------|
| **X (Twitter)** | 토글 **Enable** 로 켜기 |
| **Client ID** | X Developer Portal 앱의 **Client ID** (OAuth 2.0) 붙여넣기 |
| **Client Secret** | 같은 앱의 **Client Secret** 붙여넣기 |
| **Save** | 저장 버튼 클릭 |

→ Client ID / Secret 발급 방법은 아래 **5. X Developer Portal** 참고.

---

## 3. URL Configuration (리다이렉트 URL)

**경로**: Authentication → **URL Configuration**

### 3-1. Site URL

| 항목 | 입력값 예시 |
|------|-------------|
| **Site URL** | 로컬 테스트: `http://localhost:3000`<br>실서비스: `https://실제도메인.com` (예: `https://1thedesire.com`) |

실서비스 도메인이 정해지면 그 주소로 바꾸면 됩니다.

### 3-2. Redirect URLs

**Redirect URLs** 목록에 아래 주소들을 **전부 추가**합니다. (한 줄에 하나씩)

**로컬 개발용**

```
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
```

**실서비스용** (도메인 확정 후 추가)

```
https://실제도메인.com/auth/callback
https://실제도메인.com/auth/confirm
```

예: 도메인이 `https://1thedesire.com` 이라면

```
https://1thedesire.com/auth/callback
https://1thedesire.com/auth/confirm
```

- `auth/callback` → Google / X 로그인 후 돌아오는 주소
- `auth/confirm` → 이메일 매직 링크 클릭 후 돌아오는 주소

추가 후 **Save** 클릭.

---

## 4. Google Cloud Console (Google 로그인용)

Supabase에 넣을 **Client ID / Client Secret**을 만드는 단계입니다.

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 상단에서 **프로젝트 선택** (또는 새 프로젝트 생성)
3. **APIs & Services** → **Credentials**
4. **+ Create Credentials** → **OAuth client ID** 선택
5. **Application type**: **Web application**
6. **Authorized redirect URIs**에 아래 주소 **정확히** 추가 후 저장  
   (Supabase 프로젝트 URL의 `<PROJECT_REF>` 부분만 본인 프로젝트에 맞게 바꾸기)

   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```

   예: Supabase 프로젝트 URL이 `https://abcdefgh.supabase.co` 이면

   ```
   https://abcdefgh.supabase.co/auth/v1/callback
   ```

7. **OAuth consent screen**이 안 되어 있으면 먼저 설정  
   - **APIs & Services** → **OAuth consent screen**  
   - User type 선택 후 앱 이름 등 필수 항목 입력
8. 생성된 **Client ID**, **Client Secret** 복사  
   → Supabase **Authentication → Providers → Google**에 붙여넣기 (위 2-2 참고)

---

## 5. X Developer Portal (X 로그인용)

Supabase에 넣을 **Client ID / Client Secret**을 만드는 단계입니다.

1. [X Developer Portal](https://developer.x.com/) 접속 후 로그인
2. **Developer Portal** → **Projects & Apps** → 사용할 앱 선택 (또는 **Create App**)
3. 해당 앱 설정에서 **User authentication settings** → **Set up** (또는 **Edit**)
4. **OAuth 2.0** 설정:
   - **App permissions**: 필요한 범위만 (예: Read)
   - **Type of App**: **Web App**
   - **Callback URI / Redirect URL**에 Supabase 콜백 주소 추가:

     ```
     https://<PROJECT_REF>.supabase.co/auth/v1/callback
     ```

     `<PROJECT_REF>`는 Supabase 프로젝트 URL에 나오는 식별자.
   - **Website URL**: 서비스 주소 (예: `https://1thedesire.com` 또는 `http://localhost:3000`)
5. 저장 후 **Client ID**, **Client Secret** 확인  
   → Supabase **Authentication → Providers → X (Twitter)**에 붙여넣기 (위 2-3 참고)

---

## 6. Supabase 콜백 URL 확인하는 방법

Google / X 설정할 때 쓰는 **Redirect URI**는 다음 형식입니다.

```
https://<PROJECT_REF>.supabase.co/auth/v1/callback
```

**PROJECT_REF 찾는 방법**

1. Supabase 대시보드 → **Project Settings** (휴지통 아이콘 옆 톱니바퀴)
2. **General** 탭에서 **Reference ID** 또는 프로젝트 URL 확인  
   예: `https://abcdefgh.supabase.co` → `abcdefgh` 가 PROJECT_REF

이 주소를 **Google Cloud Console**과 **X Developer Portal** 양쪽의 Redirect/Callback URI에 똑같이 넣으면 됩니다.

---

## 7. 체크리스트 (내가 할 일)

아래 순서대로 하면 됩니다.

| # | 할 일 | 완료 |
|---|--------|------|
| 1 | Supabase → **URL Configuration** 에서 **Site URL** 설정 | ☐ |
| 2 | Supabase → **URL Configuration** 에서 **Redirect URLs**에 `auth/callback`, `auth/confirm` (로컬 + 실서비스 도메인) 추가 | ☐ |
| 3 | Supabase → **Providers** 에서 **Email** Enable | ☐ |
| 4 | Google Cloud Console에서 OAuth 클라이언트 생성, Redirect URI에 Supabase 콜백 주소 추가 | ☐ |
| 5 | Supabase → **Providers** 에서 **Google** Enable, Client ID / Secret 입력 후 Save | ☐ |
| 6 | X Developer Portal에서 앱 OAuth 2.0 설정, Callback URL에 Supabase 콜백 주소 추가 | ☐ |
| 7 | Supabase → **Providers** 에서 **X (Twitter)** Enable, Client ID / Secret 입력 후 Save | ☐ |
| 8 | 로컬(`npm run dev`)에서 Google / X / 이메일 링크 로그인 각각 테스트 | ☐ |

---

## 8. 참고

- **이메일 매직 링크**: Supabase에서 이메일 보내는 설정(스펙)은 기본값 그대로 써도 동작합니다. 커스텀 SMTP 쓰려면 **Project Settings → Authentication → SMTP** 에서 따로 설정.
- **환경 변수**: 앱 쪽 `.env.local` 에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 가 이미 있으면 Supabase 설정만으로 로그인 연동 가능합니다.

더 자세한 설명은 같은 폴더의 `social-login-setup.md` 를 참고하면 됩니다.
