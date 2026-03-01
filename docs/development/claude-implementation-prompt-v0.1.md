# 욕망백서 Claude 구현 프롬프트 v0.1

## 1. 사용 목적

- 실제 구현 담당자에게 바로 전달할 수 있는 작업 프롬프트다.

## 2. 프롬프트

```text
프로젝트 경로:
c:\Users\yeomj\OneDrive\Desktop\욕망백서

작업 방식:
- 먼저 코드를 섣불리 쓰지 말고 docs 폴더의 문서를 읽고 현재 기준을 정확히 파악해라.
- 구현 중 기준이 충돌하면 임의로 판단하지 말고 문서 우선순위를 따라라.
- 사용 가능한 MCP가 있으면 먼저 어떤 MCP가 연결되어 있는지 확인하고, 활용 가능한 범위를 짧게 정리해라.

문서 우선순위:
1. docs/planning/key-decisions-summary-v0.1.md
2. docs/planning/final-brief-v0.1.md
3. docs/planning/state-based-functional-spec-v0.1.md
4. docs/planning/feature-reprioritization-v0.1.md
5. docs/development/api-contracts-v0.1.md
6. docs/development/supabase-sql-v0.1.md
7. docs/development/rls-policy-spec-v0.1.md
8. docs/planning/frontend-implementation-checklist-v0.1.md
9. docs/planning/backend-implementation-checklist-v0.1.md
10. docs/development/mcp-skill-integration-v0.1.md

반드시 지켜야 할 핵심 정책:
- 초기 플랫폼은 PWA / 모바일 웹
- 새 DM 요청 시 90P 차감
- 거절 시 45P 환불
- 24시간 미응답 만료 시 90P 전액 환불
- 차단 시 환불 없음
- 여성 가입 시 270P 지급
- 수락 후 대화 무료
- 가입 시 자동 소개글 생성

MCP 활용 원칙:
- Supabase MCP가 있으면 스키마 반영, SQL 검증, 테스트 데이터 확인에 활용해라.
- Browser 또는 Playwright MCP가 있으면 가입, DM 요청, 수락/거절/만료, 환불 UI를 실제로 검증해라.
- Filesystem/Repo MCP가 있으면 코드 탐색과 변경 위치 확인에 활용해라.
- GitHub MCP가 있으면 변경사항을 PR 단위로 요약해라.
- MCP가 없으면 문서 기준으로 로컬 구현을 진행해라.

구현 우선순위:
1. 가입 / 온보딩
2. 자동 소개글 생성
3. 홈 피드
4. 프로필 상세
5. DM 요청 / 수락 / 거절 / 만료 / 차단
6. 포인트 내역
7. 신고 / 차단
8. 관리자 기본 도구

구현 원칙:
- 상태값 중심으로 구현
- 포인트 증감은 반드시 거래 로그를 남길 것
- 환불 중복 방지 장치를 둘 것
- RLS는 접근 제어 중심, 비즈니스 로직은 서버 액션 중심
- UI 문구는 docs/planning/copy-library-v0.1.md 와 docs/planning/wire-copy-v0.1.md 기준
- 디자인 톤은 docs/planning/design-system-v1.md 기준

구현 전에 먼저 할 일:
1. 현재 코드 구조 파악
2. 사용 가능한 MCP 목록과 활용 계획 정리
3. 필요한 환경변수 목록 정리
4. 누락된 구현 계약이 있으면 먼저 짧게 보완
5. 단계별 작업 계획 제시
6. 그 다음 구현 시작

첫 응답에는 아래 4가지를 먼저 제시해라:
1. 읽은 핵심 문서 요약
2. 현재 코드 구조 요약
3. 사용 가능한 MCP와 활용 계획
4. 구현 단계 계획
5. 바로 착수할 첫 작업
```

## 3. 최종 판단

이 프롬프트는 구현자가 문서를 무시하고 임의로 정책을 바꾸지 않도록 막는 최소 안전장치다.
