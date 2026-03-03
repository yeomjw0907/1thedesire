'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { REGIONS, AGE_BAND_OPTIONS } from '@/lib/constants/signup'

type Params = {
  sort?: string
  gender?: string
  role?: string
  region?: string
  age_band?: string | string[]
}

function normalizeAgeBands(v: string | string[] | undefined): string[] {
  if (v == null) return []
  return (Array.isArray(v) ? v : [v]).filter((b) => b && AGE_BAND_KEYS.includes(b))
}

const AGE_BAND_KEYS = ['20s', '30s', '40s', '50plus'] as const

const ROLE_OPTIONS = ['Dom', 'Sub', 'Switch'] as const

function buildUrl(params: Omit<Params, 'age_band'> & { age_band?: string[] }): string {
  const sp = new URLSearchParams()
  if (params.sort) sp.set('sort', params.sort)
  if (params.gender) sp.set('gender', params.gender)
  if (params.role) sp.set('role', params.role)
  if (params.region) sp.set('region', params.region)
  ;(params.age_band ?? []).forEach((b) => sp.append('age_band', b))
  const qs = sp.toString()
  return `/home${qs ? `?${qs}` : ''}`
}

export function HomeAdvancedFilter({ current }: { current: Params }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [region, setRegion] = useState<string>(current.region ?? '')
  const [regionExpanded, setRegionExpanded] = useState(false)
  const [ageBands, setAgeBands] = useState<string[]>(() => normalizeAgeBands(current.age_band))
  const [role, setRole] = useState<string>(current.role ?? '')

  const hasActiveFilter = !!(
    current.region ||
    normalizeAgeBands(current.age_band).length > 0 ||
    current.role
  )

  function openSheet() {
    setRegion(current.region ?? '')
    setAgeBands(normalizeAgeBands(current.age_band))
    setRole(current.role ?? '')
    setRegionExpanded(false)
    setOpen(true)
  }

  function selectRegion(value: string) {
    setRegion(value)
    setRegionExpanded(false)
  }

  function toggleAgeBand(key: string) {
    setAgeBands((prev) =>
      prev.includes(key) ? prev.filter((b) => b !== key) : [...prev, key]
    )
  }

  function handleApply() {
    router.push(
      buildUrl({
        ...current,
        region: region || undefined,
        age_band: ageBands.length > 0 ? ageBands : undefined,
        role: role || undefined,
      })
    )
    setOpen(false)
  }

  function handleReset() {
    setRegion('')
    setAgeBands([])
    setRole('')
    router.push(buildUrl({ ...current, region: undefined, age_band: undefined, role: undefined }))
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-chip
                   bg-surface-750 text-text-secondary text-[11px] font-medium
                   border border-surface-700 active:bg-surface-700 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        필터
        {hasActiveFilter && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-desire-400" />
        )}
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div
              className="relative bg-surface-800 rounded-t-[24px] px-5 pt-2 border-t border-surface-700
                         max-h-[80vh] overflow-y-auto flex flex-col
                         pb-[max(2.5rem,env(safe-area-inset-bottom))]"
              role="dialog"
              aria-modal="true"
              aria-labelledby="advanced-filter-title"
            >
              <div className="w-10 h-1 bg-surface-700 rounded-chip mx-auto mt-3 mb-5 flex-shrink-0" />
              <h2 id="advanced-filter-title" className="text-text-strong text-lg font-semibold mb-4 flex-shrink-0">
                필터
              </h2>

              {/* 성향 */}
              <div className="mb-5 flex-shrink-0">
                <label className="block text-text-muted text-xs font-medium mb-2">성향</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('')}
                    className={`py-3 rounded-xl text-sm font-medium border transition-colors
                      ${!role
                        ? 'bg-trust-500/15 text-trust-400 border-trust-500/40'
                        : 'bg-surface-750 text-text-secondary border-surface-700'}`}
                  >
                    전체
                  </button>
                  {ROLE_OPTIONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(role === r ? '' : r)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors
                        ${role === r
                          ? 'bg-trust-500/15 text-trust-400 border-trust-500/40'
                          : 'bg-surface-750 text-text-secondary border-surface-700'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* 지역 - 클릭 시 리스트 펼침 */}
              <div className="mb-5 flex-shrink-0">
                <label className="block text-text-muted text-xs font-medium mb-2">지역</label>
                <div className="rounded-xl border border-surface-700 bg-surface-750 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRegionExpanded((prev) => !prev)}
                    className="w-full px-4 py-3.5 text-left text-sm font-medium text-text-primary
                             flex items-center justify-between active:bg-surface-700/80 transition-colors"
                  >
                    <span>{region || '전체'}</span>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={`transition-transform ${regionExpanded ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {regionExpanded && (
                    <div
                      className="max-h-[200px] overflow-y-auto border-t border-surface-700/80
                                 [scrollbar-width:thin]
                                 [scrollbar-color:theme(colors.surface.700)_theme(colors.surface.800)]
                                 [&::-webkit-scrollbar]:w-1.5
                                 [&::-webkit-scrollbar-track]:bg-surface-800
                                 [&::-webkit-scrollbar-thumb]:rounded-full
                                 [&::-webkit-scrollbar-thumb]:bg-surface-700
                                 [&::-webkit-scrollbar-thumb]:min-h-[40px]"
                    >
                      <button
                        type="button"
                        onClick={() => selectRegion('')}
                        className={`w-full px-4 py-3.5 text-left text-sm font-medium transition-colors
                          flex items-center justify-between
                          ${!region
                            ? 'bg-desire-500/15 text-desire-400'
                            : 'text-text-primary active:bg-surface-700/80'}`}
                      >
                        <span>전체</span>
                        {!region && (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </button>
                      {(REGIONS as readonly string[]).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => selectRegion(r)}
                          className={`w-full px-4 py-3.5 text-left text-sm font-medium transition-colors
                            flex items-center justify-between border-t border-surface-700/80
                            ${region === r
                              ? 'bg-desire-500/15 text-desire-400'
                              : 'text-text-primary active:bg-surface-700/80'}`}
                        >
                          <span>{r}</span>
                          {region === r && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* 나이 - 복수 선택 (전체 선택 시 나머지 해제) */}
              <div className="mb-6 flex-shrink-0">
                <label className="block text-text-muted text-xs font-medium mb-2">나이</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAgeBands([])}
                    className={`py-3 rounded-xl text-sm font-medium border transition-colors
                      ${ageBands.length === 0
                        ? 'bg-desire-500/15 text-desire-400 border-desire-500/40'
                        : 'bg-surface-750 text-text-secondary border-surface-700'}`}
                  >
                    전체
                  </button>
                  {AGE_BAND_OPTIONS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleAgeBand(key)}
                      className={`py-3 rounded-xl text-sm font-medium border transition-colors
                        ${ageBands.includes(key)
                          ? 'bg-desire-500/15 text-desire-400 border-desire-500/40'
                          : 'bg-surface-750 text-text-secondary border-surface-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 flex-shrink-0 mt-auto pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-3.5 rounded-chip bg-surface-750 text-text-muted text-sm font-medium
                           border border-surface-700 active:bg-surface-700"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 py-3.5 rounded-chip bg-desire-500 text-white text-sm font-semibold
                           active:bg-desire-400"
                >
                  적용
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}
