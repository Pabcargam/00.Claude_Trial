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

  useEffect(() => {
    if (!element) return undefined
    const update = () =>
      setEdges({
        back: element.scrollLeft > 1,
        forward: element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
      })
    update()
    element.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      element.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [element])

  const page = useCallback(
    (direction) =>
      element?.scrollBy?.({ left: direction * element.clientWidth, behavior: 'smooth' }),
    [element],
  )

  return { ref: setElement, element, canBack: edges.back, canForward: edges.forward, page }
}
