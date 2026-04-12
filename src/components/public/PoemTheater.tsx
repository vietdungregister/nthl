'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'

interface RandomWork {
  id: string
  title: string
  slug: string
  genre: string
  genreLabel: string
  content: string
  lineCount: number
  writtenAt: string | null
}

interface Props {
  initialWork: RandomWork
}

const MAX_SHORT_LINES = 15   // thơ ngắn: hiện full
const MAX_SHORT_CHARS = 500  // văn xuôi ngắn: hiện full

function formatDate(dateStr: string): string {
  // "2004-03-05" → "05.03.04"
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}.${parts[1]}.${parts[0].slice(2)}`
}

function renderPoemLines(content: string) {
  return content.split('\n').map((line, i) => (
    <span key={i}>
      {line || <>&nbsp;</>}
      <br />
    </span>
  ))
}

export default function PoemTheater({ initialWork }: Props) {
  const [work, setWork] = useState<RandomWork>(initialWork)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [phase, setPhase] = useState<'in' | 'out' | 'idle'>('idle')
  const feedRef = useRef<HTMLDivElement | null>(null)

  const isPoem = work.genre === 'poem' || work.genre === 'stt'
  const isShort = isPoem
    ? work.lineCount <= MAX_SHORT_LINES
    : work.content.length <= MAX_SHORT_CHARS
  const showFull = isShort || isExpanded

  const rawDisplay = showFull
    ? work.content
    : isPoem
      ? work.content.split('\n').filter(l => l.trim()).slice(0, 8).join('\n')
      : work.content.slice(0, MAX_SHORT_CHARS).trimEnd()

  // Content already cleaned server-side for initialWork;
  // for subsequent fetches (/api/random-work) clean here
  const displayContent = rawDisplay
  const displayTitle = work.title

  const fetchNext = useCallback(async () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setIsExpanded(false)
    setPhase('out')

    await new Promise(r => setTimeout(r, 350))

    try {
      const res = await fetch(`/api/random-work?excludeId=${work.id}`)
      if (res.ok) {
        const data = await res.json()
        setWork(data)
      }
    } catch (e) {
      console.error('Theater fetch error', e)
    }

    setPhase('in')
    await new Promise(r => setTimeout(r, 350))
    setPhase('idle')
    setIsTransitioning(false)
  }, [isTransitioning, work.id])

  const scrollToFeed = useCallback(() => {
    const feedSection = document.getElementById('theater-feed')
    if (feedSection) {
      feedSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (/INPUT|TEXTAREA|SELECT/.test(tag)) return

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        fetchNext()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToFeed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchNext, scrollToFeed])

  const contentClass = [
    'theater__content',
    phase === 'out' ? 'theater__content--out' : '',
    phase === 'in' ? 'theater__content--in' : '',
  ].filter(Boolean).join(' ')

  return (
    <section className="theater" aria-label="Tác phẩm ngẫu nhiên">
      <div className={contentClass}>
        {/* Author name — always visible */}
        <p className="theater__author">Nguyễn Thế Hoàng Linh</p>

        {/* Title → link to full page */}
        <Link href={`/tac-pham/${work.slug}`} className="theater__title">
          {displayTitle}
        </Link>

        {/* Poem / prose content */}
        <div className={`theater__body ${isPoem ? 'theater__body--poem' : 'theater__body--prose'}`}>
          {isPoem
            ? renderPoemLines(displayContent)
            : displayContent
          }
          {!showFull && (
            <p className="theater__body-ellipsis">…</p>
          )}
        </div>

        {/* Expand button — only for long works */}
        {!isShort && !isExpanded && (
          <button
            className="theater__expand"
            onClick={() => setIsExpanded(true)}
            aria-label="Đọc toàn bài"
          >
            Đọc tiếp ↓
          </button>
        )}

        {/* Meta: genre + date */}
        <p className="theater__meta">
          <span>{work.genreLabel}</span>
          {work.writtenAt && (
            <><span className="theater__meta-dot">·</span><span>{formatDate(work.writtenAt)}</span></>
          )}
        </p>

        {/* Navigation — 3 buttons same row */}
        <div className="theater__nav">
          <button
            className="theater__nav-btn"
            onClick={fetchNext}
            disabled={isTransitioning}
            aria-label="Bài khác"
          >
            ← Bài khác
          </button>
          <Link href="/tac-pham" className="theater__nav-btn theater__nav-btn--center">
            Toàn bộ tác phẩm ↗
          </Link>
          <button
            className="theater__nav-btn"
            onClick={fetchNext}
            disabled={isTransitioning}
            aria-label="Bài khác"
          >
            Bài khác →
          </button>
        </div>


      </div>
    </section>
  )
}
