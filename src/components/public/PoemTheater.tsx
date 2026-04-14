'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSwipeable } from 'react-swipeable'

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
const MAX_SHORT_CHARS = 360  // văn xuôi ngắn: hiện full (tighter)
const MAX_EXPAND_CHARS = 700 // giới hạn khi "Đọc tiếp" — tránh overflow

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
  const [history, setHistory] = useState<RandomWork[]>([])  // history for back navigation
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [phase, setPhase] = useState<'in' | 'out' | 'idle'>('idle')

  const isPoem = work.genre === 'poem' || work.genre === 'stt'
  const isShort = isPoem
    ? work.lineCount <= MAX_SHORT_LINES
    : work.content.length <= MAX_SHORT_CHARS
  const showFull = isShort || isExpanded

  const rawDisplay = showFull
    ? isPoem
      ? work.content
      : work.content.slice(0, MAX_EXPAND_CHARS).trimEnd()
    : isPoem
      ? work.content.split('\n').filter(l => l.trim()).slice(0, 8).join('\n')
      : work.content.slice(0, MAX_SHORT_CHARS).trimEnd()

  const displayContent = rawDisplay
  const displayTitle = work.title

  // Fetch next random work, saving current to history
  const fetchNext = useCallback(async () => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setIsExpanded(false)
    setPhase('out')

    const currentWork = work  // capture before state change

    await new Promise(r => setTimeout(r, 350))

    try {
      const res = await fetch(`/api/random-work?excludeId=${currentWork.id}`)
      if (res.ok) {
        const data = await res.json()
        setHistory(prev => [...prev, currentWork])  // push current to history
        setWork(data)
      }
    } catch (e) {
      console.error('Theater fetch error', e)
    }

    setPhase('in')
    await new Promise(r => setTimeout(r, 350))
    setPhase('idle')
    setIsTransitioning(false)
  }, [isTransitioning, work])

  // Go back to previous work in history
  const goBack = useCallback(async () => {
    if (isTransitioning || history.length === 0) return
    setIsTransitioning(true)
    setIsExpanded(false)
    setPhase('out')

    await new Promise(r => setTimeout(r, 350))

    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setWork(prev)

    setPhase('in')
    await new Promise(r => setTimeout(r, 350))
    setPhase('idle')
    setIsTransitioning(false)
  }, [isTransitioning, history])

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

      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        fetchNext()
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goBack()
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        scrollToFeed()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [fetchNext, goBack, scrollToFeed])

  // Touch swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => fetchNext(),   // swipe left → next
    onSwipedRight: () => goBack(),     // swipe right → back
    preventScrollOnSwipe: true,
    trackMouse: false,                 // touch only, not mouse
    delta: 50,                         // min swipe distance
  })

  const contentClass = [
    'theater__content',
    phase === 'out' ? 'theater__content--out' : '',
    phase === 'in' ? 'theater__content--in' : '',
  ].filter(Boolean).join(' ')

  const canGoBack = history.length > 0

  return (
    <section
      className="theater"
      aria-label="Tác phẩm ngẫu nhiên"
      {...swipeHandlers}  // attach swipe to whole theater section
    >
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
            onClick={goBack}
            disabled={isTransitioning || !canGoBack}
            aria-label="Bài trước"
            style={{ opacity: canGoBack ? 1 : 0.3 }}
          >
            ← Quay lại
          </button>
          <Link href="/tac-pham" className="theater__nav-btn theater__nav-btn--center">
            Toàn bộ tác phẩm ↗
          </Link>
          <button
            className="theater__nav-btn"
            onClick={fetchNext}
            disabled={isTransitioning}
            aria-label="Bài tiếp theo"
          >
            Bài khác →
          </button>
        </div>

        {/* Mobile swipe hint — shown only if no history yet */}
        {!canGoBack && (
          <p className="theater__scroll-hint-text" style={{ marginTop: 16 }}>
            Vuốt ← → để đổi bài · Chạm để đọc tiếp
          </p>
        )}

      </div>
    </section>
  )
}
