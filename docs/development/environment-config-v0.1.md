# 욕망백서 환경변수 및 외부 서비스 문서 v0.1

## 1. 목적

- 구현에 필요한 환경변수와 외부 서비스 범위를 정리한다.

## 2. 핵심 환경변수 범주

- Supabase URL
- Supabase anon key
- Supabase service role key
- Auth callback URL
- Storage bucket name
- Payment provider secret
- Notification provider key
- App base URL

## 3. 권장 문서화 방식

- `.env.example`에 키 목록만 둔다
- 실제 비밀값은 저장하지 않는다

## 4. 외부 서비스 후보

- Supabase
- 결제/입금 확인 서비스
- 알림 서비스
- 로그/분석 서비스

## 5. 최종 판단

환경변수 문서가 없으면 구현자가 가장 먼저 헤맨다.
