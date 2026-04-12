'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  prevSlug?: string
  nextSlug?: string
}

export default function KeyboardNav({ prevSlug, nextSlug }: Props) {
  const router = useRouter()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Không kích hoạt khi đang focus input
      const tag = (e.target as HTMLElement)?.tagName
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'ArrowLeft' && prevSlug) {
        e.preventDefault()
        router.push(`/tac-pham/${prevSlug}`)
      }
      if (e.key === 'ArrowRight' && nextSlug) {
        e.preventDefault()
        router.push(`/tac-pham/${nextSlug}`)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prevSlug, nextSlug, router])

  return null // invisible component
}
