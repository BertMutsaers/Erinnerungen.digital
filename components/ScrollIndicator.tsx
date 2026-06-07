'use client'

import { useEffect, useRef, useState } from 'react'

export interface PhaseItem {
  key:   string
  label: string
}

interface Props {
  phases: PhaseItem[]
}

export default function ScrollIndicator({ phases }: Props) {
  const [activeKey,  setActiveKey]  = useState<string | null>(null)
  const [showLabel,  setShowLabel]  = useState(false)
  const labelTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track visible sections via IntersectionObserver
  useEffect(() => {
    if (phases.length === 0) return

    const visibleSections = new Set<string>()

    function updateActive() {
      // Pick the topmost visible section
      for (const { key } of phases) {
        if (visibleSections.has(key)) {
          setActiveKey(key)
          return
        }
      }
      setActiveKey(null)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = (entry.target as HTMLElement).dataset.phaseKey
          if (!key) continue
          if (entry.isIntersecting) {
            visibleSections.add(key)
          } else {
            visibleSections.delete(key)
          }
        }
        updateActive()
      },
      {
        // Section becomes active when it enters the top 60% of viewport
        rootMargin: '0px 0px -40% 0px',
        threshold:  0,
      },
    )

    for (const { key } of phases) {
      const el = document.getElementById(`section-${key}`)
      if (el) {
        // Ensure data-phase-key is set for the observer callback
        el.dataset.phaseKey = key
        observer.observe(el)
      }
    }

    return () => observer.disconnect()
  }, [phases])

  // Show label for 1.5s when active changes
  useEffect(() => {
    if (!activeKey) return
    setShowLabel(true)
    if (labelTimer.current) clearTimeout(labelTimer.current)
    labelTimer.current = setTimeout(() => setShowLabel(false), 1500)
    return () => { if (labelTimer.current) clearTimeout(labelTimer.current) }
  }, [activeKey])

  function scrollTo(key: string) {
    const el = document.getElementById(`section-${key}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Show label when tapped
    setActiveKey(key)
    setShowLabel(true)
    if (labelTimer.current) clearTimeout(labelTimer.current)
    labelTimer.current = setTimeout(() => setShowLabel(false), 1500)
  }

  if (phases.length === 0) return null

  return (
    <div
      className="fixed z-40 flex flex-col items-center"
      style={{ right: 12, top: '50%', transform: 'translateY(-50%)' }}
    >
      {phases.map(({ key, label }, i) => {
        const isActive = activeKey === key
        return (
          <div key={key} className="flex flex-col items-center">
            {/* Connector line (not before first dot) */}
            {i > 0 && (
              <div style={{ width: 1, height: 28, background: 'rgba(0,0,0,0.12)' }} />
            )}

            {/* Dot row */}
            <div className="relative flex items-center">
              {/* Label (left of dot) */}
              <div
                className="absolute right-full mr-2 whitespace-nowrap pointer-events-none"
                style={{
                  opacity: isActive && showLabel ? 1 : 0,
                  transition: 'opacity 300ms ease',
                }}
              >
                <span
                  className="font-sans"
                  style={{
                    fontSize: 10,
                    color: '#000',
                    background: '#fff',
                    padding: '2px 6px',
                    borderRadius: 4,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                  }}
                >
                  {label}
                </span>
              </div>

              {/* Dot */}
              <button
                onClick={() => scrollTo(key)}
                aria-label={label}
                style={{
                  width:        isActive ? 8 : 6,
                  height:       isActive ? 8 : 6,
                  borderRadius: '50%',
                  background:   isActive ? '#000' : 'rgba(0,0,0,0.18)',
                  transition:   'all 250ms ease',
                  flexShrink:   0,
                  display:      'block',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
