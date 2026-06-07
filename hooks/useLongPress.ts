'use client'

import { useRef, useState, useCallback, PointerEvent } from 'react'

interface UseLongPressOptions {
  onShortPress: () => void
  onLongPress:  () => void
  threshold?:   number // ms to trigger long press (default 500)
}

interface UseLongPressResult {
  handlers: {
    onPointerDown: (e: PointerEvent) => void
    onPointerUp:   (e: PointerEvent) => void
    onPointerMove: (e: PointerEvent) => void
    onPointerLeave:(e: PointerEvent) => void
  }
  pressing: boolean // true after 300ms, for scale feedback
}

export function useLongPress({
  onShortPress,
  onLongPress,
  threshold = 500,
}: UseLongPressOptions): UseLongPressResult {
  const [pressing, setPressing] = useState(false)

  const scaleTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startPos    = useRef<{ x: number; y: number } | null>(null)
  const triggered   = useRef(false)

  const cancel = useCallback(() => {
    if (scaleTimer.current)  clearTimeout(scaleTimer.current)
    if (triggerTimer.current) clearTimeout(triggerTimer.current)
    scaleTimer.current  = null
    triggerTimer.current = null
    setPressing(false)
    triggered.current = false
  }, [])

  const onPointerDown = useCallback((e: PointerEvent) => {
    // Only primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return
    startPos.current  = { x: e.clientX, y: e.clientY }
    triggered.current = false

    scaleTimer.current = setTimeout(() => setPressing(true), 300)

    triggerTimer.current = setTimeout(() => {
      triggered.current = true
      setPressing(false)
      if (navigator.vibrate) navigator.vibrate(40)
      onLongPress()
    }, threshold)
  }, [onLongPress, threshold])

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!triggered.current) {
      cancel()
      onShortPress()
    } else {
      cancel()
    }
  }, [cancel, onShortPress])

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!startPos.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    if (Math.sqrt(dx * dx + dy * dy) > 10) cancel()
  }, [cancel])

  const onPointerLeave = useCallback(() => cancel(), [cancel])

  return {
    handlers: { onPointerDown, onPointerUp, onPointerMove, onPointerLeave },
    pressing,
  }
}
