export const REGIONS = [
  '서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종',
  '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주', '해외',
] as const

export const AGES = Array.from({ length: 32 }, (_, i) => i + 19) as readonly number[]

/** 나이대 필터용: URL age_band 값 → 해당 age_group 목록 */
export const AGE_BAND_TO_GROUPS: Record<string, string[]> = {
  '20s': Array.from({ length: 10 }, (_, i) => String(i + 20)),
  '30s': Array.from({ length: 10 }, (_, i) => String(i + 30)),
  '40s': Array.from({ length: 10 }, (_, i) => String(i + 40)),
  '50plus': ['50', '50+'],
}

export const AGE_BAND_OPTIONS = [
  { key: '20s', label: '20대' },
  { key: '30s', label: '30대' },
  { key: '40s', label: '40대' },
  { key: '50plus', label: '50+' },
] as const
