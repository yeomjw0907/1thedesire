export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '해외',
] as const

export const AGES = Array.from({ length: 32 }, (_, i) => i + 19) as readonly number[]
