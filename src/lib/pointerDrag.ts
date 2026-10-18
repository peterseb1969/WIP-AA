import type { PointerEvent as ReactPointerEvent } from 'react'

/**
 * Pointer-based dragging, shared by every drag in the app (Corkboard cards,
 * chapter rows). A press turns into a drag only after the pointer moves 5px;
 * until then it is a normal click. While dragging, `findTarget` maps the
 * pointer position to a drop target (or null). Escape or pointercancel
 * cancels. After a real drag the click the browser fires on pointerup is
 * swallowed, so a dropped link or row does not also open or toggle.
 *
 * This replaces the browser's HTML5 drag-and-drop, which could leave a drag
 * session hanging after a drop so the next drag never started.
 */
export function startPointerDrag<T>(
  e: ReactPointerEvent,
  opts: {
    findTarget: (x: number, y: number) => T | null
    /** Every pointer move once the drag is active. */
    onMove: (x: number, y: number, target: T | null) => void
    /** Once, when an active drag ends; `target` is null when cancelled. */
    onEnd: (target: T | null) => void
  },
) {
  if (e.button !== 0) return
  const startX = e.clientX
  const startY = e.clientY
  let active = false
  let target: T | null = null

  const cleanup = () => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('pointercancel', onCancel)
    window.removeEventListener('keydown', onKey)
    document.body.style.userSelect = ''
  }
  const finish = (drop: boolean) => {
    cleanup()
    if (!active) return // a plain click: let it through
    swallowNextClick()
    opts.onEnd(drop ? target : null)
  }
  const onMove = (ev: PointerEvent) => {
    if (!active) {
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return
      active = true
      document.body.style.userSelect = 'none'
    }
    target = opts.findTarget(ev.clientX, ev.clientY)
    opts.onMove(ev.clientX, ev.clientY, target)
  }
  const onUp = () => finish(true)
  const onCancel = () => finish(false)
  const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') finish(false) }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('pointercancel', onCancel)
  window.addEventListener('keydown', onKey)
}

/**
 * Stop the click that follows a drag's pointerup before React or a link sees
 * it (capture phase on window). Cleared after 300ms in case no click comes,
 * e.g. when the pointer was released outside the window.
 */
function swallowNextClick() {
  const onClick = (ev: MouseEvent) => {
    ev.preventDefault()
    ev.stopPropagation()
    done()
  }
  const done = () => {
    window.removeEventListener('click', onClick, true)
    clearTimeout(timer)
  }
  window.addEventListener('click', onClick, true)
  const timer = setTimeout(done, 300)
}

/**
 * For vertical lists: is the pointer in the upper half of `el`? Dropping
 * there inserts before it, in the lower half after it.
 */
export function isUpperHalf(el: Element, y: number) {
  const r = el.getBoundingClientRect()
  return y < r.top + r.height / 2
}
