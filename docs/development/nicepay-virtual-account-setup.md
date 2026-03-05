# NICE페이 가상계좌 연동 정리

**실서비스 도메인**: `1thedesire.com`  
**키**: NICE페이 키는 이미 env에 설정되어 있음 (참고용).

**구현 기준**: NICE페이 공식 **시작하기(Quick guide)** — **Server 승인 모델 / Basic 인증** 기준으로 맞춤.  
(결제창 JS SDK → returnUrl POST → 승인 API `POST /v1/payments/{tid}`, Authorization: Basic Base64(clientKey:secretKey))

---

## 0. NICE페이 Quick guide 요약 (참고)

- **결제창**: `pay.nicepay.co.kr/v1/js/` JS SDK, `AUTHNICE.requestPay({ clientId, method, orderId, amount, goodsName, returnUrl, fnError })`  
  → 결제 후 **returnUrl**로 POST (application/x-www-form-urlencoded).  
  → `authResultCode: '0000'` 이면 인증 성공, **tid**를 승인 API로 전달.
- **승인 API**: `POST https://sandbox-api.nicepay.co.kr/v1/payments/{tid}` (테스트) / `https://api.nicepay.co.kr/v1/payments/{tid}` (운영)  
  Header: `Authorization: Basic Base64(clientKey:secretKey)`, Body: `{ "amount": 금액 }`.  
  응답 `resultCode: "0000"`, `status: "paid"` 이면 결제 완료.
- **개발정보**: 로그인 후 **개발정보** 탭에서 KEY(Client-key, Secret-key), **웹훅** 추가/삭제, **TEST 호출**, **로그** 확인.
- **웹훅**: “유효한 도메인” 등록 후 **TEST 호출** 버튼으로 End-point가 **정상 응답(200)** 하는지 반드시 확인.  
  발송 시점: 결제(승인) 시, 가상계좌 채번 시, **가상계좌 입금 시**, 취소 시.

---

## 1. 현재 구현 요약

### 1.1 연동 범위 (Quick guide와 일치)

- **카드 결제**:  
  결제창 `AUTHNICE.requestPay({ clientId, method: 'card', orderId, amount, goodsName, returnUrl })`  
  → NICE가 **returnUrl**로 POST (authResultCode, tid, orderId, amount 등)  
  → 우리 **return** 핸들러에서 `authResultCode === '0000'` 검증 후 **승인 API** `POST /v1/payments/{tid}` (Basic 인증, body `{ amount }`) 호출  
  → 성공 시 `approve_charge_atomic`으로 포인트 충전 완료.
- **가상계좌**:  
  가상계좌 발급 요청 후, 입금 시 NICE가 **웹훅**으로 `/api/payment/nicepay/webhook` 호출  
  → `approve_charge_atomic`으로 포인트 충전 완료. (웹훅 발송 시점: 가상계좌 입금 시)

### 1.2 관련 파일

| 구분 | 경로 |
|------|------|
| API 클라이언트 | `src/lib/nicepay/client.ts` |
| 가상계좌 발급 호출 | `src/lib/actions/points.ts` → `createNicePayChargeRequest` |
| 입금 통보 웹훅 | `src/app/api/payment/nicepay/webhook/route.ts` |
| 카드 return URL | `src/app/api/payment/nicepay/return/route.ts` |
| 충전 UI | `src/components/points/ChargeSheet.tsx` |
| DB 컬럼/인덱스 | `supabase/migrations/202603150001_add_nicepay_charge.sql` |
| 충전 승인 RPC | `supabase/migrations/202603140001_approve_charge_atomic.sql` |

### 1.3 환경변수 (`.env.local`)

키는 이미 env에 설정되어 있음. 아래는 참고용 변수명.

```bash
# NICE페이 (가맹점 개발정보에서 발급 – Server 승인, Basic 인증)
NICEPAY_CLIENT_KEY=     # 서버 API용
NICEPAY_SECRET_KEY=     # 서버 API용
NEXT_PUBLIC_NICEPAY_CLIENT_KEY=  # 결제창(JS SDK)용 – 카드 결제 시 사용

# 실서비스: 1thedesire.com 기준으로 웹훅/return URL 계산에 사용
NEXT_PUBLIC_APP_URL=https://1thedesire.com

# 선택: API 베이스 URL (미설정 시 개발=sandbox, 프로덕션=live)
# NICEPAY_API_BASE_URL=https://sandbox-api.nicepay.co.kr
```

---

## 2. 발급·설정 해야 할 것 (체크리스트)

### 2.1 NICE페이 가맹점 계약

- [ ] **나이스페이(또는 나이스페이먼츠) 가맹점 신청/계약**  
  - 가상계좌 + 카드 결제 사용 시 두 서비스 모두 계약이 필요할 수 있음.  
  - 공식: [나이스페이](https://www.nicepay.co.kr) / [나이스페이먼츠](https://nicepayments.com)에서 가맹점 신청.

### 2.2 가맹점 관리자에서 발급·설정

- [x] **가맹점 개발정보에서 키 발급** (완료 – 키는 이미 env에 설정됨)
  - `NICEPAY_CLIENT_KEY`, `NICEPAY_SECRET_KEY`, `NEXT_PUBLIC_NICEPAY_CLIENT_KEY` 참고.

- [ ] **웹훅 등록 (개발정보 > 웹훅)**
  - **로그인 → 개발정보 → 웹훅 → 추가** 에서 **End-point** 와 **결제수단** 설정.
  - **End-point(URL)** 에 아래 주소 등록 (유효한 도메인 필수):
    - **`https://1thedesire.com/api/payment/nicepay/webhook`**
  - **결제수단**: **가상계좌** 선택 (가상계좌 채번·입금·환불 시 콜백).
  - **등록 후 반드시 "TEST 호출" 버튼**으로 우리 End-point가 **200**으로 응답하는지 확인.  
    (307 등이 나오면 등록 실패 — 아래 4.1 참고.)
  - 실패 시 재전송은 **개발정보 > 로그 상세보기 > 웹훅 탭**에서 주문번호 검색 후 재전송.

- [ ] **카드 결제 returnUrl**
  - Quick guide 상 returnUrl은 “API를 호출할 Endpoint”. 결제창 인증 후 NICE가 이 URL로 **POST** 전송.
  - 실서비스 기준: **`https://1thedesire.com/api/payment/nicepay/return`**
  - 샌드박스 테스트 후 운영 반영 시: JS SDK·API 도메인을 운영계로, clientId·secretKey를 운영계 KEY로 변경.

### 2.3 서버/배포 설정

- [ ] **실서비스 도메인 HTTPS**
  - 실서비스: **https://1thedesire.com** – 웹훅은 NICE페이 서버 → 이 도메인으로만 호출되므로 HTTPS·외부 접근 가능해야 함.
  - 로컬 테스트 시에는 ngrok 등으로 HTTPS URL 노출 후, 해당 URL을 테스트용 입금 통보 URL로 등록.

- [ ] **미들웨어**
  - `/api/payment` 경로는 인증 없이 허용되도록 이미 설정됨 (NICE 서버 웹훅은 비인증 POST).

---

## 3. 가상계좌 API 참고 (나이스페이 공식 기준)

현재 코드는 **REST 스타일** `POST {baseUrl}/v1/virtual-accounts` 를 사용합니다.

- 나이스페이 **공식 개발자 매뉴얼** 상 가상계좌 발급은  
  `https://webapi.nicepay.co.kr/webapi/get_vacount.jsp`  
  **POST (application/x-www-form-urlencoded, EUC-KR)** 와  
  **TID, MID, Amt, Moid, GoodsName, BankCode, VbankExpDate, SignData** 등 파라미터를 사용하는 경우가 많습니다.

**해야 할 일:**

- [ ] **가맹점 계약 후 받은 “개발자 매뉴얼” 또는 “REST API 명세”**에서 가상계좌 발급 **실제 사용 URL·파라미터** 확인.
- [ ] 현재 `src/lib/nicepay/client.ts`의 `requestVirtualAccount()`가 사용하는 엔드포인트(`/v1/virtual-accounts`)가 해당 가맹점/버전에서 지원하는지 확인.
- [ ] 만약 **JSP(form) 방식만 지원**하면, `requestVirtualAccount()`를 `webapi.nicepay.co.kr/webapi/get_vacount.jsp` + form body(EUC-KR) + SignData 등으로 변경해야 합니다. (매뉴얼의 TID 생성 규칙, SignData 계산 규칙 준수.)

---

## 4. 웹훅 동작 요약

- **실서비스 전체 URL**: `POST https://1thedesire.com/api/payment/nicepay/webhook`
- **경로**: `POST /api/payment/nicepay/webhook`
- **수신 형식**: `application/json` 또는 `application/x-www-form-urlencoded` (둘 다 처리).
- **주문번호**: `moid` / `MOID` / `Moid` / `orderId` 중 하나로 수신되면, 해당 값을 `payment_moid`로 저장된 건과 매칭.
- **응답**: body `"OK"`, status `200` (매뉴얼 요구사항).
- **한글 인코딩**: 입금 통보는 EUC-KR로 올 수 있음. 현재는 moid/orderId만 사용하므로 UTF-8 파싱으로도 동작할 가능성이 높으나, 한글 필드 사용 시 디코딩 필요할 수 있음.

### 4.1 웹훅 등록 실패 시 (Http status code 307)

공식 가이드: “등록 후 **TEST 호출** 버튼으로 웹훅 전문이 정상 응답되는지 반드시 확인.”  
**TEST 호출** 시 우리 End-point가 **200**이 아니면(예: 307) 등록이 실패한다.

**307 원인**: NICE가 TEST 호출(또는 검증) 시 우리 URL을 호출할 때 **리다이렉트** 응답을 받는 경우(대표적으로 http→https 307).

**우선 시도:**

1. **End-point URL을 반드시 `https://` 로 등록**  
   `https://1thedesire.com/api/payment/nicepay/webhook` (끝 슬래시 없음)
2. **끝에 슬래시 있는 URL로 등록**  
   `https://1thedesire.com/api/payment/nicepay/webhook/`  
   서버에서 슬래시 경로는 리다이렉트 없이 200 주도록 rewrite 해 두었음.
3. **개발정보 > 로그** 에서 웹훅 요청 상세 확인 — 어떤 URL/메서드로 호출했는지, 응답 코드가 뭔지 확인 후 방화벽/리다이렉트 원인 점검.

**그래도 307이면 (가능성 높음):**  
NICE 측이 웹훅 TEST 호출을 **HTTP**로 보내고, 호스팅(Vercel)이 **HTTPS**로 307 리다이렉트하는 경우입니다.  
Vercel은 경로별로 “HTTP→HTTPS 리다이렉트 끄기”를 지원하지 않아, 우리 코드만으로는 307을 막을 수 없습니다.

**해결:** NICE페이에 웹훅 검증을 **HTTPS**로 해 달라고 요청해야 합니다.

- **1:1 문의/고객센터** 에 아래 내용으로 문의하면 됩니다.

---

**[문의 예시]**

제목: 웹훅(URL 통보) 등록 시 Http status code 307 오류

내용:
- 웹훅 End-point를 https://1thedesire.com/api/payment/nicepay/webhook 로 등록하려고 합니다.
- 브라우저에서 해당 URL로 직접 접속하면 200 OK가 정상 반환됩니다.
- 그런데 웹훅 등록 또는 TEST 호출 시에 한해 “Http status code : 307” 로 실패합니다.
- 저희 서버는 Vercel 등 호스팅에서 HTTP 요청을 HTTPS로 307 리다이렉트하고 있어, 웹훅 검증/TEST 호출을 **HTTP**로 하시면 307이 발생하는 것으로 보입니다.
- **웹훅 URL 검증 및 TEST 호출 시 요청을 HTTPS(https://) 로 보내 주실 수 있는지** 확인 부탁드립니다.

### 4.2 307 추가로 시도할 것: 도메인 정규화 (www vs 비www)

Vercel·다른 호스팅에서 **웹훅 307/308**이 나는 경우, **도메인 리다이렉트** 때문일 수 있다.  
(예: `1thedesire.com` → `www.1thedesire.com` 또는 그 반대.)

- **Vercel**: 프로젝트 **Settings → Domains** 에서 **Primary 도메인**이 뭔지 확인.
- 웹훅 URL은 **리다이렉트되지 않는, 실제 서비스에 쓰는 그 주소**로 등록.
  - Primary가 `https://1thedesire.com` 이면 → `https://1thedesire.com/api/payment/nicepay/webhook`
  - Primary가 `https://www.1thedesire.com` 이면 → `https://www.1thedesire.com/api/payment/nicepay/webhook`
- 브라우저에서 **주소창에 그 URL을 그대로 입력**했을 때 리다이렉트 없이 200이 나와야 한다.  
  한 번 리다이렉트되면 NICE가 307을 받을 수 있으므로, **리다이렉트되는 쪽 URL은 웹훅에 쓰지 말 것.**

---

## 5. 점검 시 확인할 것

1. **환경변수**: 키는 env에 있음. 실서비스 기준 `NEXT_PUBLIC_APP_URL=https://1thedesire.com` 확인.
2. **가맹점관리자**: 입금 통보 URL 등록 및 활성화, 관리자 이메일.
3. **가상계좌 발급 API**: 매뉴얼과 실제 엔드포인트·파라미터 일치 여부.
4. **DB**: `point_transactions.payment_moid`, `payment_provider` 컬럼 및 `approve_charge_atomic` RPC 적용 여부 (`202603150001`, `202603140001` 마이그레이션 적용).

위 체크리스트와 매뉴얼 확인 후, 발급·설정을 마치면 가상계좌 연동을 마무리할 수 있습니다.

---

## 6. 307이 해결되지 않을 때: 대안 PG

NICE 웹훅 307이 계속되고, NICE 측 HTTPS 검증 적용이 어렵다면 **다른 PG**로 가상계좌를 연동하는 선택지가 있다.  
Vercel·Next.js 환경에서 웹훅/가상계좌 연동 사례가 많고, 문서가 잘 되어 있는 쪽을 추천한다.

| PG | 가상계좌 | 웹훅 | 특징 |
|----|----------|------|------|
| **토스페이먼츠** | ○ (API·결제창 둘 다) | ○ (입금 알림 등), 10초 내 200 필수 | 문서·SDK 양호, 국내 서비스 연동 사례 많음. [가상계좌 API](https://docs.tosspayments.com/guides/payment/virtual-account-api), [웹훅](https://docs.tosspayments.com/guides/v2/webhook) |
| **포트원(아임포트)** | ○ (여러 PG 통합) | PG별 상이 | NICE·토스·다날 등 여러 PG를 하나의 API로. PG 교체 시 포트원 한 곳만 바꾸면 됨. [포트원](https://portone.io) |
| **다날** | ○ | ○ | 가상계좌·입금 기한 등 지원. [다날 개발자센터](https://developers.danalpay.com) |

**추천 방향**

- **우선**: 위 **4.2 도메인 정규화**까지 적용해서 NICE 웹훅 URL을 **리다이렉트 없는 정확한 주소**로 다시 등록해 보고, 그래도 307이면 NICE 1:1 문의(HTTPS 검증 요청).
- **전환 검토**: NICE가 어렵다면 **토스페이먼츠**가 문서·가상계좌 API·웹훅 명세가 명확하고, Next.js/Vercel 연동 예제도 많아서 이전이 수월한 편이다. (기존 NICE 카드 결제는 유지하고 가상계좌만 토스로 두는 식도 가능.)
- **통합 유지**: 여러 PG를 한 번에 쓰거나 나중에 PG를 바꿀 가능성이 있으면 **포트원**으로 통합해 두면, PG사별 웹훅/도메인 이슈를 포트원 한 곳 기준으로만 맞추면 된다.
