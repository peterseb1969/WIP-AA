import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Width of a panel resized by dragging a handle on its LEFT edge (dragging
 * left widens it). Clamped to [min, max]; the last width is remembered per
 * browser under `storageKey` — a viewer convenience, so storage failures
 * (private mode, blocked site data) are ignored.
 */
export function useResizableWidth(storageKey: string, defaultWidth: number, min: number, max: number) {
  const clamp = (w: number) => Math.min(max, Math.max(min, w))

  const [width, setWidth] = useState(() => {
    try {
      const saved = Number(localStorage.getItem(storageKey))
      if (saved) return clamp(saved)
    } catch { /* storage unavailable */ }
    return defaultWidth
  })

  const widthRef = useRef(width)
  widthRef.current = width

  useEffect(() => {
    try { localStorage.setItem(storageKey, String(width)) } catch { /* storage unavailable */ }
  }, [storageKey, width])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthRef.current
    const onMove = (ev: PointerEvent) => setWidth(clamp(startWidth + (startX - ev.clientX)))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    // Keep the resize cursor and suppress text selection while dragging,
    // even when the pointer leaves the thin handle.
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => setWidth(defaultWidth), [defaultWidth])

  return { width, onPointerDown, reset }
}
