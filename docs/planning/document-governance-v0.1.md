# 욕망백서 문서 정리 및 버전 관리 v0.1

## 1. 목적

- 현재 문서 체계를 유지하고 확장하기 위한 기본 규칙을 정한다.
- 문서가 많아져도 어디를 업데이트해야 하는지 혼란이 생기지 않게 한다.

## 2. 폴더 원칙

### `planning/`

- 기획
- UX
- 디자인
- 운영 가이드
- 제품 전략

### `legal/`

- 이용약관
- 개인정보처리방침
- 환불 및 운영정책

### `development/`

- DB 설계
- SQL
- 마이그레이션 계획

## 3. 버전 관리 원칙

- 큰 변화가 있으면 파일명 버전을 올린다
- 작은 수정은 같은 파일 내에서 갱신한다
- 이미 참조가 많이 걸린 파일은 가능하면 새 버전 파일로 올린다

예:

- `brand-positioning-v0.1.md` -> `brand-positioning-v0.2.md`

## 4. 어떤 문서를 먼저 업데이트해야 하는가

### 제품 정책이 바뀌면

우선 업데이트:

1. `planning/prd-v0.1.md`
2. `planning/policy-v0.1.md`
3. `legal/point-refund-policy-v0.1.md`
4. `development/supabase-sql-v0.1.md`

### UX 흐름이 바뀌면

우선 업데이트:

1. `planning/state-based-functional-spec-v0.1.md`
2. `planning/wireframes-v0.1.md`
3. `planning/hifi-ui-spec-v0.1.md`
4. `planning/wire-copy-v0.1.md`

### 브랜드 톤이 바뀌면

우선 업데이트:

1. `planning/brand-positioning-v0.2.md`
2. `planning/design-system-v1.md`
3. `planning/copy-library-v0.1.md`
4. `planning/naming-and-copy-expansion-v0.1.md`

### 운영 기준이 바뀌면

우선 업데이트:

1. `planning/moderation-scenarios-v0.1.md`
2. `planning/operations-manual-v0.1.md`
3. `planning/admin-console-spec-v0.1.md`
4. `legal/operation-policy-v0.1.md`

## 5. 문서 작성 원칙

- 문서는 실행 판단에 도움이 되어야 한다
- 추상적 슬로건만 있는 문서는 지양한다
- 한 문서는 한 역할을 중심으로 가진다
- 파일명만 봐도 내용이 예상되어야 한다

## 6. 문서 상태 표시 제안

필요 시 각 문서에 아래 상태를 둘 수 있다.

- `draft`
- `active`
- `archived`

현재는 파일명 버전과 본문 상단 버전 표기로 관리한다.

## 7. 중복을 허용하는 기준

- 요약 문서는 중복 허용
- 법률 문구와 UX 문구는 중복 가능
- 단, 정책 숫자와 상태값은 반드시 동일해야 한다

예:

- `90P`, `45P 환불`, `24시간 만료`는 어디서든 같아야 한다

## 8. 업데이트 시 체크리스트

- 이 변경이 정책 숫자에 영향 주는가
- 이 변경이 상태값에 영향 주는가
- 이 변경이 UX 문구에 영향 주는가
- 이 변경이 SQL/DB에 영향 주는가
- 이 변경이 법률 문서에 영향 주는가

## 9. 권장 운영 방식

- 큰 방향 수정 전에는 `key-decisions-summary`부터 본다
- 세부 기능 논의 전에는 `product-document-index`를 본다
- 변경 후에는 README 목록까지 같이 맞춘다

## 10. 최종 판단

문서 체계가 무너지면 제품 판단도 흔들린다.

욕망백서는 이미 문서가 충분히 쌓였기 때문에,  
이제부터는 `새 문서를 쓰는 것`보다 `어느 문서를 같이 갱신할지 아는 것`이 더 중요하다.
