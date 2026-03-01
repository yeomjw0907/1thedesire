# Supabase Dashboard 설정 체크리스트

MCP로 적용할 수 없는 항목은 Supabase Dashboard에서 수동 확인·설정하세요.

## 1. Auth Redirect URL

**경로**: Dashboard → Authentication → URL Configuration

- **Site URL**: 앱 기본 URL (예: `http://localhost:3000` 또는 `https://1thedesire.com`)
- **Redirect URLs**에 다음이 포함되어 있는지 확인:
  - `http://localhost:3000/auth/callback`
  - `https://1thedesire.com/auth/callback`
  - (실제 사용하는 포트/도메인이 다르면 해당 URL 추가)

`.env.local`의 `NEXT_PUBLIC_APP_URL`과 맞추면 됩니다.

## 2. Service Role Key

**경로**: Dashboard → Project Settings → API

- **service_role** 키는 MCP로 조회할 수 없습니다.
- Dashboard에서 **Project API keys** → **service_role** 값을 복사해 `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`에 설정하세요.
- 서버 전용이며 클라이언트에 노출하면 안 됩니다.

## 3. Storage 버킷 (선택)

마이그레이션 `202602280018_storage_post_images`로 `post-images` 버킷이 생성되었을 수 있습니다.  
Dashboard → Storage에서 `post-images` 버킷 존재 여부와 공개 읽기 설정을 확인하세요.

## 4. X(트위터) 로그인 사용 시

**경로**: Dashboard → Authentication → Providers

- **X (Twitter)** 프로바이더를 켜고, **Client ID**와 **Client Secret**을 입력하세요.
- Client ID/Secret은 [X Developer Portal](https://developer.x.com/)에서 프로젝트·앱 생성 후 **User authentication settings**에서 OAuth 2.0을 설정해 발급받습니다.
- Callback URL에는 Supabase가 안내하는 URL(예: `https://<project-ref>.supabase.co/auth/v1/callback`)을 X 앱 설정에 등록해야 합니다.
