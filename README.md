# 욕망백서

취향 기반 익명 소셜 피드와 합의 기반 1:1 DM을 결합한 모바일 중심 성인 플랫폼

> **도메인**: [https://1thedesire.com](https://1thedesire.com)

## 핵심 컨셉

- **익명 피드**: 취향·성향 기반 글/이미지 탐색
- **합의 기반 DM**: 대화 요청 → 상대 수락 → 채팅 활성화 (포인트 선차감)
- **안전 장치**: 신고·차단·모더레이션, STI 인증 뱃지
- **1인 운영 최적화**: 자동화된 포인트·결제·만료 처리

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS 3 |
| 언어 | TypeScript |
| 백엔드 / DB | Supabase (PostgreSQL, Auth, Storage, RLS) |
| 배포 | Vercel |
| 예약 작업 | Vercel Cron (DM 만료 처리 등) |

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── (main)/             # 인증 후 메인 레이아웃
│   │   ├── home/           # 홈 피드
│   │   ├── search/         # 검색·탐색
│   │   ├── dm/             # DM 목록 및 채팅방
│   │   ├── points/         # 포인트 내역
│   │   └── profile/        # 프로필, 편집, STI 인증
│   ├── admin/              # 관리자 패널
│   ├── signup/             # 회원가입 플로우
│   ├── login/              # 로그인
│   ├── post/write/         # 글 작성
│   ├── legal/              # 약관·개인정보처리방침
│   └── api/cron/           # Vercel Cron 엔드포인트
├── components/             # UI 컴포넌트
│   ├── auth/               # 소셜 로그인, 이메일 인증
│   ├── dm/                 # 채팅방 클라이언트
│   ├── profile/            # 프로필, DM 요청, 신고, 차단
│   ├── post/               # 게시글 관련
│   ├── points/             # 포인트 충전
│   ├── sti/                # STI 인증 관련
│   ├── admin/              # 관리자 컴포넌트
│   ├── layout/             # 하단 네비게이션
│   └── legal/              # 약관 모달
├── lib/
│   ├── actions/            # Server Actions (signup, posts, dm, profile 등)
│   └── supabase/           # Supabase 클라이언트 (server, client, admin)
└── types/                  # TypeScript 타입 정의

supabase/
└── migrations/             # DB 마이그레이션 SQL 파일

docs/
├── planning/               # 기획·UX·디자인 문서
├── development/            # DB 스키마, API, 환경설정, 구현 문서
├── legal/                  # 이용약관, 운영정책, 개인정보처리방침
├── deployment/             # 배포 가이드
└── review/                 # 리뷰·점검 문서
```

## 시작하기

### 사전 요구사항

- Node.js 18+
- Supabase 프로젝트 (Auth, Database, Storage 활성화)

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 환경변수 설정
cp .env.local.example .env.local
# .env.local 파일에 Supabase 키 입력

# 개발 서버 실행
npm run dev          # macOS / Linux
npm run dev:win      # Windows (UTF-8 인코딩 설정 포함)
```

### 환경변수

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 공개 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) |
| `NEXT_PUBLIC_APP_URL` | 앱 기본 URL (`http://localhost:3000`) |

### 데이터베이스 마이그레이션

Supabase SQL Editor에서 `supabase/migrations/` 폴더의 SQL 파일을 **파일명 순서대로** 실행합니다. 자세한 절차는 `docs/deployment/vercel-setup-guide.md`를 참고하세요.

## 주요 스크립트

```bash
npm run dev       # 개발 서버 (localhost:3000)
npm run build     # 프로덕션 빌드
npm run start     # 프로덕션 서버
npm run lint      # ESLint 검사
```

## 주요 기능

### 사용자

- **소셜 로그인**: Google, Twitter(X), 이메일 OTP
- **프로필**: 닉네임, 성별, 연령대, 지역, 성향, 자기소개
- **피드**: 최신순 글 목록, 이미지 첨부, 태그
- **검색**: 닉네임·지역·성향·태그 필터
- **DM**: 포인트 90P 선차감 → 합의 → 채팅 (거절 시 45P 환불, 미응답 만료 시 전액 환불)
- **포인트**: 충전 내역·차감 내역 조회
- **신고·차단**: 유저·게시글·채팅 신고, 차단 시 상호 비노출
- **STI 인증**: 건강 검진 인증 뱃지 (업로드 → 관리자 승인)

### 관리자

- 유저·게시글·신고·포인트 거래 내역 조회
- 유저 정지·차단, 게시글 숨김
- STI 인증 요청 승인·거절

## 문서

전체 기획·개발·법률 문서는 `docs/` 폴더에서 관리됩니다. 문서 목록은 `docs/README.md`를 참고하세요.

| 분류 | 주요 문서 |
|------|----------|
| 기획 | PRD, 와이어프레임, 디자인 시스템, UX 원칙, 브랜드 포지셔닝 |
| 개발 | DB 스키마, API 계약, RLS 정책, 에러 상태, 크론 작업 |
| 법률 | 이용약관, 개인정보처리방침, 운영정책, 포인트·환불 정책 |
| 배포 | Vercel + Supabase 설정 가이드 |

## 라이선스

Private — 무단 복제 및 배포를 금합니다.
