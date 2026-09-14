'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export function StorePurchaseConfirmation() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    if (!sessionId || searchParams.get('store') !== 'success') return
    void fetch(`/api/stripe/store-confirm?session_id=${encodeURIComponent(sessionId)}`)
  }, [searchParams, sessionId])

  return null
}
