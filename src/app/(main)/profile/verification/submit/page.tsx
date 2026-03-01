'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StiVerificationConsentForm } from '@/components/sti/StiVerificationConsentForm'
import { StiVerificationUploadForm } from '@/components/sti/StiVerificationUploadForm'

type Step = 'consent' | 'upload'

export default function StiSubmitPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('consent')
  const [consentPublic, setConsentPublic] = useState(false)

  function handleConsentNext(isPublic: boolean) {
    setConsentPublic(isPublic)
    setStep('upload')
  }

  return (
    <div className="min-h-full pb-10">
      <header className="sticky top-0 z-10 flex items-center px-2 py-2
                         bg-bg-900/95 backdrop-blur-sm border-b border-surface-700/40">
        <button
          type="button"
          onClick={() => step === 'upload' ? setStep('consent') : router.back()}
          className="p-2 text-text-secondary active:text-text-primary transition-colors"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="text-text-strong text-base font-semibold ml-1">최근검사 확인 제출</h1>

        {/* 진행 표시 */}
        <div className="flex gap-1.5 ml-auto mr-2">
          {(['consent', 'upload'] as Step[]).map((s, i) => (
            <span
              key={s}
              className={`w-1.5 h-1.5 rounded-full transition-colors
                          ${step === s ? 'bg-desire-500' : i < (['consent', 'upload'] as Step[]).indexOf(step) ? 'bg-desire-500/40' : 'bg-surface-700'}`}
            />
          ))}
        </div>
      </header>

      <div className="px-4 pt-6">
        {step === 'consent' && (
          <StiVerificationConsentForm
            onNext={handleConsentNext}
            onCancel={() => router.back()}
          />
        )}
        {step === 'upload' && (
          <StiVerificationUploadForm
            consentPublic={consentPublic}
            onBack={() => setStep('consent')}
          />
        )}
      </div>
    </div>
  )
}
