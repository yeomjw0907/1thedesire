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

**그래도 307이면:** NICE 측이 TEST 호출을 **http**로 보내고, 호스팅(Vercel 등)이 https로 307 리다이렉트하는 경우.  
→ NICE페이 고객센터에 “웹훅 TEST 호출 시 **HTTPS**로 요청해 달라”고 문의.

---

## 5. 점검 시 확인할 것

1. **환경변수**: 키는 env에 있음. 실서비스 기준 `NEXT_PUBLIC_APP_URL=https://1thedesire.com` 확인.
2. **가맹점관리자**: 입금 통보 URL 등록 및 활성화, 관리자 이메일.
3. **가상계좌 발급 API**: 매뉴얼과 실제 엔드포인트·파라미터 일치 여부.
4. **DB**: `point_transactions.payment_moid`, `payment_provider` 컬럼 및 `approve_charge_atomic` RPC 적용 여부 (`202603150001`, `202603140001` 마이그레이션 적용).

위 체크리스트와 매뉴얼 확인 후, 발급·설정을 마치면 가상계좌 연동을 마무리할 수 있습니다.
