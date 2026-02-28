import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calculator, AlertCircle, TrendingDown, MessageCircle, ExternalLink, Copy, Phone } from 'lucide-react';

// Google Analytics 타입 선언
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// 카테고리별 요율 데이터
const categoryData: Record<string, Record<string, { dutyRate: number; vatRate: number }>> = {
  "의류/패션": {
    "일반 의류 (티셔츠/바지/아우터)": { dutyRate: 0.13, vatRate: 0.10 },
    "신발/운동화": { dutyRate: 0.13, vatRate: 0.10 },
    "가방/지갑/액세서리": { dutyRate: 0.08, vatRate: 0.10 },
    "선글라스": { dutyRate: 0.08, vatRate: 0.10 },
    "시계/보석/귀금속": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "뷰티/화장품": {
    "화장품/향수": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "가전/디지털": {
    "컴퓨터/노트북/태블릿": { dutyRate: 0.00, vatRate: 0.10 },
    "스마트워치/이어폰": { dutyRate: 0.00, vatRate: 0.10 },
    "소형가전/조명/LED": { dutyRate: 0.08, vatRate: 0.10 },
    "CD/MP3/DVD/스피커": { dutyRate: 0.08, vatRate: 0.10 },
    "디지털 카메라": { dutyRate: 0.08, vatRate: 0.10 },
    "공기청정기": { dutyRate: 0.08, vatRate: 0.10 },
    "전동휠/킥보드": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "생활/주방/가구": {
    "주방식기/조리도구": { dutyRate: 0.08, vatRate: 0.10 },
    "플라스틱 정리/수납함": { dutyRate: 0.065, vatRate: 0.10 },
    "침구/커튼/러그": { dutyRate: 0.13, vatRate: 0.10 },
    "목재 가구": { dutyRate: 0.00, vatRate: 0.10 },
    "커피머신": { dutyRate: 0.08, vatRate: 0.10 },
    "유모차": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "문구/완구/취미": {
    "일반 완구/장난감": { dutyRate: 0.08, vatRate: 0.10 },
    "문구류/캠핑/스포츠": { dutyRate: 0.08, vatRate: 0.10 },
    "디지털 카메라": { dutyRate: 0.08, vatRate: 0.10 },
    "캠핑장비": { dutyRate: 0.08, vatRate: 0.10 },
    "텐트": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "스포츠/레저": {
    "캠핑장비": { dutyRate: 0.08, vatRate: 0.10 },
    "텐트": { dutyRate: 0.08, vatRate: 0.10 },
    "골프채": { dutyRate: 0.08, vatRate: 0.10 },
    "자전거(부품)": { dutyRate: 0.08, vatRate: 0.10 },
    "전동휠/킥보드": { dutyRate: 0.08, vatRate: 0.10 },
    "선글라스": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "건강/식품": {
    "건강보조식품": { dutyRate: 0.08, vatRate: 0.10 },
    "식품(과자/시리얼/젤리 등)": { dutyRate: 0.08, vatRate: 0.10 }
  },
  "반려동물": {
    "반려동물 의류": { dutyRate: 0.13, vatRate: 0.10 },
    "반려동물 용품/장난감": { dutyRate: 0.08, vatRate: 0.10 }
  }
};

// 배송비 계산 함수 (0.5kg 단위 올림)
const calculateShippingCost = (weight: number): number => {
  if (weight <= 0) return 0;
  // 0.5kg 단위로 올림
  const roundedWeight = Math.ceil(weight * 2) / 2;
  // 기본 배송비: 0.5kg = 5,800원, 이후 0.5kg당 +500원
  const baseCost = 5800;
  const additionalCost = (roundedWeight - 0.5) * 1000; // 0.5kg당 500원이지만 1kg당 1000원
  return baseCost + Math.max(0, additionalCost);
};

// 세금 계산 함수 (CIF 기준: Cost + Insurance + Freight)
const calculateTax = (
  purchasePrice: number,
  exchangeRate: number,
  weight: number,
  dutyRate: number,
  vatRate: number
) => {
  const itemPrice = purchasePrice * exchangeRate; // 물건 가격 (원) - Cost
  const shippingCost = calculateShippingCost(weight); // 과세 운임 - Freight
  const insurance = itemPrice * 0.0075; // 보험료 (물건 가격의 0.75%) - Insurance
  const taxableBase = itemPrice + shippingCost + insurance; // 과세표준 (CIF 기준)
  const dutyRaw = taxableBase * dutyRate; // 관세 (원본)
  const duty = Math.floor(dutyRaw / 10) * 10; // 관세 (10원 단위 내림)
  const vatRaw = (taxableBase + duty) * vatRate; // 부가세 (원본)
  const vat = Math.floor(vatRaw / 10) * 10; // 부가세 (10원 단위 내림)
  const totalTax = duty + vat; // 총 납부 세액

  return {
    itemPrice,
    shippingCost,
    insurance,
    taxableBase,
    duty,
    vat,
    totalTax
  };
};

const Hero: React.FC = () => {
  const [mainCategory, setMainCategory] = useState<string>('');
  const [subCategory, setSubCategory] = useState<string>('');
  const [purchasePrice, setPurchasePrice] = useState<string>('');
  const [exchangeRate, setExchangeRate] = useState<string>('190');
  const [weight, setWeight] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const hasTrackedCalculation = useRef<boolean>(false);

  // 소분류 옵션
  const subCategoryOptions = mainCategory ? Object.keys(categoryData[mainCategory] || {}) : [];

  // 링크 복사 함수
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Google Analytics 이벤트 전송
      if (window.gtag) {
        window.gtag('event', 'link_copied', {
          event_category: 'CTA',
          event_label: 'Link Copy Button'
        });
      }
    } catch (err) {
      console.error('링크 복사 실패:', err);
    }
  };

  // 문의 버튼 클릭 추적 함수
  const trackInquiryClick = (type: 'kakao' | 'phone' | 'website') => {
    if (window.gtag) {
      window.gtag('event', 'inquiry_clicked', {
        event_category: 'CTA',
        event_label: type === 'kakao' ? 'Kakao Inquiry' : type === 'phone' ? 'Phone Inquiry' : 'Website Visit',
        inquiry_type: type
      });
    }
  };


  // 계산 결과
  const calculationResult = useMemo(() => {
    if (!mainCategory || !subCategory || !purchasePrice || !exchangeRate || !weight) {
      hasTrackedCalculation.current = false;
      return null;
    }

    const price = parseFloat(purchasePrice);
    const rate = parseFloat(exchangeRate);
    const w = parseFloat(weight);

    if (isNaN(price) || isNaN(rate) || isNaN(w) || price <= 0 || rate <= 0 || w <= 0) {
      hasTrackedCalculation.current = false;
      return null;
    }

    const categoryInfo = categoryData[mainCategory]?.[subCategory];
    if (!categoryInfo) {
      hasTrackedCalculation.current = false;
      return null;
    }

    return calculateTax(price, rate, w, categoryInfo.dutyRate, categoryInfo.vatRate);
  }, [mainCategory, subCategory, purchasePrice, exchangeRate, weight]);

  // 계산 완료 이벤트 추적
  useEffect(() => {
    if (calculationResult && !hasTrackedCalculation.current) {
      hasTrackedCalculation.current = true;
      
      // Google Analytics 이벤트 전송
      if (window.gtag) {
        window.gtag('event', 'calculation_completed', {
          event_category: 'Calculator',
          event_label: `${mainCategory} - ${subCategory}`,
          value: Math.round(calculationResult.totalTax),
          currency: 'KRW',
          // GA4 커스텀 파라미터
          main_category: mainCategory,
          sub_category: subCategory,
          purchase_price: parseFloat(purchasePrice),
          exchange_rate: parseFloat(exchangeRate),
          weight: parseFloat(weight),
          total_tax: Math.round(calculationResult.totalTax),
          duty: Math.round(calculationResult.duty),
          vat: Math.round(calculationResult.vat),
          shipping_cost: Math.round(calculationResult.shippingCost)
        });
      }
    }
  }, [calculationResult, mainCategory, subCategory, purchasePrice, exchangeRate, weight]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(value));
  };

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-blue-50 via-white to-slate-50 py-12 md:py-20 px-4">
      {/* Background Decoration */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sungshin-cyan/10 rounded-full blur-[100px] bg-animation-1" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sungshin-pink/10 rounded-full blur-[100px] bg-animation-2" />
      </div>

      <div className="container mx-auto max-w-4xl relative z-10">
        {/* STEP 1: 후킹 헤드라인 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 md:mb-14"
        >
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6 break-keep">
            세관에서 폭탄 맞지 마세요.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sungshin-cyan to-blue-600">
              내 상품 진짜 통관비(세금)는 얼마일까요?
            </span>
          </h1>
          <p className="text-base md:text-lg text-gray-700 font-medium max-w-2xl mx-auto">
            회원가입 없이 즉시 확인하세요. 정확한 세금 계산으로 전문성을 경험하세요.
          </p>
        </motion.div>

        {/* STEP 2: 정보 입력 폼 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-3xl md:rounded-[2rem] shadow-2xl border-2 border-gray-200 p-8 md:p-10 mb-8 backdrop-blur-sm"
        >
          <div className="mb-6 pb-4 border-b-2 border-gray-100">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mb-2">
              통관비 계산하기
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-3">
              아래 정보를 입력하시면 즉시 통관비를 계산해드립니다
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs md:text-sm text-blue-800 font-semibold">
                ⚠️ 사업자 통관(목록통관 배제)은 금액과 상관없이 관부가세가 발생합니다.
              </p>
            </div>
          </div>

          <div className="space-y-6 md:space-y-7">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-base md:text-lg font-bold text-gray-900 mb-3">
                카테고리 <span className="text-red-500 text-xl">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                <div className="relative">
                  <select
                    value={mainCategory}
                    onChange={(e) => {
                      setMainCategory(e.target.value);
                      setSubCategory('');
                    }}
                    className="w-full px-5 py-4 md:py-5 border-2 border-gray-300 rounded-2xl focus:border-sungshin-cyan focus:outline-none focus:ring-4 focus:ring-sungshin-cyan/20 transition-all text-base md:text-lg font-medium bg-white hover:border-gray-400 cursor-pointer shadow-sm"
                  >
                    <option value="">대분류 선택</option>
                    {Object.keys(categoryData).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    disabled={!mainCategory}
                    className="w-full px-5 py-4 md:py-5 border-3 border-gray-300 rounded-2xl focus:border-sungshin-cyan focus:outline-none focus:ring-4 focus:ring-sungshin-cyan/20 transition-all text-base md:text-lg font-medium bg-white hover:border-gray-400 cursor-pointer shadow-sm disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
                  >
                    <option value="">소분류 선택</option>
                    {subCategoryOptions.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 매입 원가 */}
            <div>
              <label className="block text-base md:text-lg font-bold text-gray-900 mb-3">
                매입 원가 <span className="text-red-500 text-xl">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="numeric"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(e.target.value)}
                  placeholder="예: 100"
                  className="w-full px-5 py-4 md:py-5 pr-20 border-2 border-gray-300 rounded-2xl focus:border-sungshin-cyan focus:outline-none focus:ring-4 focus:ring-sungshin-cyan/20 transition-all text-base md:text-lg font-semibold bg-white hover:border-gray-400 shadow-sm"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 font-bold text-base md:text-lg">
                  위안(¥)
                </span>
              </div>
            </div>

            {/* 적용 환율 */}
            <div>
              <label className="block text-base md:text-lg font-bold text-gray-900 mb-3">
                적용 환율
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  placeholder="190"
                  className="w-full px-5 py-4 md:py-5 pr-20 border-2 border-gray-300 rounded-2xl focus:border-sungshin-cyan focus:outline-none focus:ring-4 focus:ring-sungshin-cyan/20 transition-all text-base md:text-lg font-semibold bg-white hover:border-gray-400 shadow-sm"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 font-bold text-base md:text-lg">
                  원(₩)
                </span>
              </div>
            </div>

            {/* 예상 무게 */}
            <div>
              <label className="block text-base md:text-lg font-bold text-gray-900 mb-3">
                예상 무게 <span className="text-red-500 text-xl">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="예: 1.5"
                  step="0.1"
                  min="0"
                  className="w-full px-5 py-4 md:py-5 pr-20 border-2 border-gray-300 rounded-2xl focus:border-sungshin-cyan focus:outline-none focus:ring-4 focus:ring-sungshin-cyan/20 transition-all text-base md:text-lg font-semibold bg-white hover:border-gray-400 shadow-sm"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-700 font-bold text-base md:text-lg">
                  kg
                </span>
              </div>
              <p className="mt-2 text-xs md:text-sm text-gray-500">
                * 부피가 큰 상품은 부피 무게(가로×세로×높이/6000)로 적용될 수 있습니다.
              </p>
            </div>
          </div>
        </motion.div>

        {/* STEP 3: 결과 화면 */}
        {calculationResult && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="bg-gradient-to-br from-sungshin-navy to-slate-800 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 mb-8 text-white"
          >
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 md:w-6 md:h-6 text-sungshin-cyan" />
              <h2 className="text-xl md:text-2xl font-bold">예상 통관비 계산 결과</h2>
            </div>

            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="w-4 h-4 text-sungshin-cyan" />
                  <span className="text-sm text-gray-300">예상 물류비(과세운임)</span>
                </div>
                <p className="text-2xl md:text-3xl font-black text-white">
                  {formatCurrency(calculationResult.shippingCost)}원
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <span className="text-sm text-gray-300 block mb-2">예상 관세</span>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {formatCurrency(calculationResult.duty)}원
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <span className="text-sm text-gray-300 block mb-2">부가세</span>
                  <p className="text-xl md:text-2xl font-bold text-white">
                    {formatCurrency(calculationResult.vat)}원
                  </p>
                </div>
              </div>

              <div className="bg-red-500/20 backdrop-blur-sm rounded-xl p-4 border-2 border-red-400/50">
                <span className="text-sm text-red-200 block mb-2">총 예상 납부 세액</span>
                <p className="text-3xl md:text-4xl font-black text-white">
                  {formatCurrency(calculationResult.totalTax)}원
                </p>
              </div>

              {/* 주의 문구 */}
              <div className="bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-400/50 mt-6">
                <h3 className="text-sm font-bold text-yellow-200 mb-3">⚠️ 알아두세요</h3>
                <ul className="space-y-2 text-xs md:text-sm text-yellow-100">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-0.5">•</span>
                    <span>본 계산은 보험료가 포함된 금액이며, 실제 통관 시 관세청이 산정하는 통상 보험료가 과세표준에 합산될 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-0.5">•</span>
                    <span>사업자 통관(목록통관 배제)은 금액과 상관없이 관부가세가 발생합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-0.5">•</span>
                    <span>부피가 큰 상품은 실중량 대신 부피 무게(가로×세로×높이/6000)로 배송비가 적용될 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-0.5">•</span>
                    <span>골프채 등 고급 소비재는 수입가가 높을 경우 특소세(개별소비세/교육세)가 추가로 발생할 수 있습니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-300 mt-0.5">•</span>
                    <span>식품류는 식품검역 비용(건당 약 10만 원)이 별도로 발생할 수 있습니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 4: 행동 유도 (CTA) */}
        {calculationResult && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gradient-to-r from-sungshin-cyan to-blue-500 rounded-2xl md:rounded-3xl shadow-xl p-6 md:p-8 text-white text-center"
          >
            <p className="text-sm md:text-base mb-6 text-white/90">
              무게가 무거워질수록 세금도 늘어납니다. 물류비를 낮춰야 세금도 줄어듭니다.
            </p>
            
            {/* 메인 CTA 버튼들 - 세로 배치 */}
            <div className="flex flex-col gap-4 mb-4">
              {/* 카톡 문의 버튼 */}
              <motion.a
                href="https://pf.kakao.com/_xdxhxexj"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => trackInquiryClick('kakao')}
                className="inline-flex items-center justify-center gap-3 bg-white text-sungshin-cyan px-6 py-4 rounded-xl font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all"
              >
                <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
                <span>📦 내 상품, 성신컴퍼니 사업자 요율표 받아보기 (카톡 문의)</span>
              </motion.a>

              {/* 전화 상담 바로하기 버튼 */}
              <motion.a
                href="tel:010-8387-8847"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => trackInquiryClick('phone')}
                className="inline-flex items-center justify-center gap-3 bg-white text-sungshin-cyan px-6 py-4 rounded-xl font-bold text-base md:text-lg shadow-lg hover:shadow-xl transition-all"
              >
                <Phone className="w-5 h-5 md:w-6 md:h-6" />
                <span>전화 상담 바로하기</span>
              </motion.a>
            </div>

            {/* 구분선 */}
            <div className="my-6 border-t border-white/30"></div>

            {/* 추가 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              {/* 성신 홈페이지 바로가기 */}
              <motion.a
                href="https://www.ck79.kr/"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => trackInquiryClick('website')}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-semibold text-sm md:text-base shadow-md hover:shadow-lg transition-all border border-white/30"
              >
                <ExternalLink className="w-4 h-4 md:w-5 md:h-5" />
                <span>성신 홈페이지 바로가기</span>
              </motion.a>

              {/* 링크 복사 */}
              <motion.button
                onClick={copyLink}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-3 rounded-xl font-semibold text-sm md:text-base shadow-md hover:shadow-lg transition-all border border-white/30"
              >
                {copied ? (
                  <>
                    <span className="w-4 h-4 md:w-5 md:h-5">✓</span>
                    <span>복사됨!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 md:w-5 md:h-5" />
                    <span>링크 복사</span>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* 입력 전 안내 메시지 */}
        {!calculationResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 md:p-8"
          >
            <p className="text-base md:text-lg text-gray-700 font-semibold">
              💡 위 정보를 입력하시면 <span className="text-sungshin-cyan font-black">즉시 통관비를 계산</span>해드립니다.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default Hero;
