# NICE페이 가상계좌 연동 정리

**실서비스 도메인**: `1thedesire.com`  
**키**: NICE페이 키는 이미 env에 설정되어 있음 (참고용).

---

## 1. 현재 구현 요약

### 1.1 연동 범위

- **카드 결제**: 결제창(JS SDK) → 인증 후 `/api/payment/nicepay/return`에서 Server 승인 → `approve_charge_atomic`으로 포인트 충전 완료.
- **가상계좌**: 가상계좌 발급 요청 → 입금 시 NICE페이가 **입금 통보(웹훅)**으로 `/api/payment/nicepay/webhook` 호출 → `approve_charge_atomic`으로 포인트 충전 완료.

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

- [ ] **가상계좌 입금 통보 URL 등록**
  - 가맹점관리자 → [가맹점정보] → [기본정보] → [가상계좌] (또는 결제데이터통보 설정).
  - **입금 통보(notiUrl) URL**에 아래 주소 등록:
    - **`https://1thedesire.com/api/payment/nicepay/webhook`**
  - **필수**: URL 저장 후 “OK” 체크(또는 활성화) 처리.
  - **관리자 이메일**: 통보 실패 시 재전송/알림 받을 이메일 입력.

- [ ] **카드 결제 return URL**
  - 실서비스 기준: **`https://1thedesire.com/api/payment/nicepay/return`**
  - 코드에서는 `NEXT_PUBLIC_APP_URL`로 위 URL을 조합함. 가맹점관리자에 “결제 완료 후 이동 URL”이 있다면 동일하게 맞춰 두기.

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

등록 시 **307**이 나오면 NICE페이 검증 요청이 **리다이렉트**를 받은 경우다.

**우선 시도:**

1. **끝에 슬래시 있는 URL로 등록**  
   `https://1thedesire.com/api/payment/nicepay/webhook/`  
   서버에서 슬래시 있는 경로는 리다이렉트 없이 200을 주도록 rewrite 해 두었음. NICE가 내부적으로 슬래시를 붙여 호출하면 이걸로 통과할 수 있음.

2. **슬래시 없이 등록**  
   `https://1thedesire.com/api/payment/nicepay/webhook`  
   (항상 **https**, 끝에 `/` 없음.)

3. **GET 검증**: NICE가 http GET으로 검증하면 미들웨어에서 200을 바로 반환하도록 해 둠. (호스팅이 그 전에 307을 주면 효과 없을 수 있음.)

**그래도 307이면:** NICE페이 측이 검증 시 **http**로 호출하고, 호스팅(Vercel 등)이 https로 307 리다이렉트하는 경우일 수 있음. 이 경우 NICE페이 고객센터에 “웹훅 URL 검증 시 HTTPS로 호출해 달라”고 문의하는 수밖에 없음.

---

## 5. 점검 시 확인할 것

1. **환경변수**: 키는 env에 있음. 실서비스 기준 `NEXT_PUBLIC_APP_URL=https://1thedesire.com` 확인.
2. **가맹점관리자**: 입금 통보 URL 등록 및 활성화, 관리자 이메일.
3. **가상계좌 발급 API**: 매뉴얼과 실제 엔드포인트·파라미터 일치 여부.
4. **DB**: `point_transactions.payment_moid`, `payment_provider` 컬럼 및 `approve_charge_atomic` RPC 적용 여부 (`202603150001`, `202603140001` 마이그레이션 적용).

위 체크리스트와 매뉴얼 확인 후, 발급·설정을 마치면 가상계좌 연동을 마무리할 수 있습니다.
