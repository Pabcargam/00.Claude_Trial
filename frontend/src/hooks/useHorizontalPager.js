import { useCallback, useEffect, useState } from 'react'

/**
 * Paging for a horizontal scroller (e.g. ‹ › buttons): whether it can still scroll back or
 * forward, and `page(±1)` to scroll by one screenful (CSS snapping then lines up whole items).
 * Pass `ref` as the scroller's ref: a callback ref, so it also works when the scroller mounts
 * later than the component that owns it.
 */
export function useHorizontalPager() {
  const [element, setElement] = useState(null)
  const [edges, setEdges] = useState({ back: false, forward: false })

  // Re-checks the edges. Runs on scroll and resize; call it yourself after moving the scroller
  // from code: browsers don't always fire a scroll event for that.
  const refresh = useCallback(() => {
    if (!element) return
    setEdges({
      back: element.scrollLeft > 1,
      forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
    })
  }, [element])

  useEffect(() => {
    if (!element) return undefined
    const frame = requestAnimationFrame(refresh) // first measure once laid out
    element.addEventListener('scroll', refresh, { passive: true })
    window.addEventListener('resize', refresh)
    return () => {
      cancelAnimationFrame(frame)
      element.removeEventListener('scroll', refresh)
      window.removeEventListener('resize', refresh)
    }
  }, [element, refresh])

  const page = useCallback(
    (direction) =>
      element?.scrollBy?.({ left: direction * element.clientWidth, behavior: 'smooth' }),
    [element],
  )

  return {
    ref: setElement,
    element,
    canBack: edges.back,
    canForward: edges.forward,
    page,
    refresh,
  }
}
