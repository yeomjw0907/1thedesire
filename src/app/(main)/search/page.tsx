import { redirect } from 'next/navigation'

/**
 * 검색 페이지는 홈으로 흡수됨
 * 기준 문서: home-centered-ia-v0.1.md §5
 *
 * 기존 검색 기능(성향/성별/지역 필터)은 홈 필터로 통합되었습니다.
 */
export default function SearchPage() {
  redirect('/home')
}
