# Claude Prompt: 최근검사 확인 구현 v0.1

아래 프롬프트를 그대로 Claude에 전달한다.

```text
너는 현재 Next.js 15 + React 19 + Supabase 기반 프로젝트에서 작업하는 시니어 엔지니어다.
이번 작업 목표는 `최근검사 확인` 기능의 사용자 노출 명칭과 카피 기준을 확정하고, 현재 STI 기능 문서에 그 기준을 반영하는 것이다.

중요 원칙:
- 사용자 노출 메인명은 반드시 `최근검사 확인`
- 이 기능은 `성병 없음 인증`이 아니다
- `안전 인증`, `무감염`, `안심 상대`, `100% 안전` 같은 표현은 절대 사용 금지
- 설명 문구에서는 필요할 때만 `최근 STI 검사 확인`이라고 정확히 풀어쓴다
- `검사 시점 기준 정보이며 현재 상태를 보증하지 않습니다` 문구는 핵심 경고 문구로 유지한다

먼저 아래 문서를 읽어라:
1. docs/development/sti-verification-feature-spec-v0.1.md
2. docs/development/sti-verification-wireflow-v0.1.md
3. docs/development/recent-check-copy-system-v0.1.md
4. docs/development/recent-check-ui-placement-v0.1.md
5. docs/review/2-sti-verification-legal-policy-draft.md
6. docs/review/6-sti-ux-copy-and-risk.md

작업 목표:
1. 기존 STI 기능 문서에서 사용자 노출 명칭을 `최근검사 확인` 기준으로 정리
2. 기능 설명, 배지 문구, 상태 문구, 공개 토글 문구를 통일
3. 프로필 / DM 요청 시트 / 상태 화면 / 관리자 화면에 들어갈 카피를 문서 기준으로 정리
4. 과장되거나 법무 리스크가 있는 표현 제거

수정 대상 문서:
- docs/development/sti-verification-feature-spec-v0.1.md
- docs/development/sti-verification-wireflow-v0.1.md
- docs/development/sti-verification-frontend-structure-v0.1.md
- docs/development/sti-verification-supabase-migration-rls-v0.1.md

원칙:
- 메인 배지 이름은 `최근검사 확인`
- 설명 문구 예시:
  - `최근 STI 검사 확인 정보를 공개한 프로필입니다`
  - `검사 시점 기준 정보이며 현재 상태를 보증하지 않습니다`
- 리스트 카드에서는 작은 칩만
- 프로필 상세에서는 검사일/만료일까지 표시
- DM 바텀시트에서는 보조 신뢰 정보로 노출
- 관리자 화면 섹션명은 `최근검사 확인 검수`

출력 방식:
1. 실제 파일을 수정해라
2. 변경한 파일 목록을 마지막에 요약해라
3. 바뀐 네이밍 규칙을 5줄 이내로 요약해라
4. 남은 위험 문구가 있으면 마지막에 따로 적어라

주의:
- 기존 깨진 한글 문자열이 있더라도, 이번 작업 범위 밖이면 함부로 전면 수정하지 말고 필요한 부분만 안전하게 고쳐라
- 기능 의미를 더 강하게 만들지 말고, 오히려 보수적으로 유지해라
```

## 사용 목적
- STI 기능 문서 네이밍 통일
- Claude가 구현/문서 수정 시 과장된 표현을 넣지 않도록 가드레일 제공
