import { act, renderHook, waitFor } from '@testing-library/react'
import { useHorizontalPager } from './useHorizontalPager'

// jsdom has no layout: a real element whose scroll sizes the test sets by hand.
function fakeScroller({ scrollLeft = 0, clientWidth = 500, scrollWidth = 1500 } = {}) {
  const element = document.createElement('div')
  Object.defineProperties(element, {
    scrollLeft: { value: scrollLeft, writable: true },
    clientWidth: { value: clientWidth, writable: true },
    scrollWidth: { value: scrollWidth, writable: true },
  })
  element.scrollBy = vi.fn()
  return element
}

function renderPager(element) {
  const hook = renderHook(() => useHorizontalPager())
  act(() => hook.result.current.ref(element))
  return hook
}

describe('useHorizontalPager', () => {
  it('can only go forward at the start, once laid out', async () => {
    const { result } = renderPager(fakeScroller())

    await waitFor(() => expect(result.current.canForward).toBe(true))
    expect(result.current.canBack).toBe(false)
  })

  it('follows scrolling: both ways in the middle, only back at the end', async () => {
    const element = fakeScroller()
    const { result } = renderPager(element)
    await waitFor(() => expect(result.current.canForward).toBe(true))

    element.scrollLeft = 500
    act(() => element.dispatchEvent(new Event('scroll')))
    expect(result.current).toMatchObject({ canBack: true, canForward: true })

    element.scrollLeft = 1000 // 1000 + 500 = the whole 1500
    act(() => element.dispatchEvent(new Event('scroll')))
    expect(result.current).toMatchObject({ canBack: true, canForward: false })
  })

  it('re-checks on window resize and on refresh() after a jump from code', async () => {
    const element = fakeScroller()
    const { result } = renderPager(element)
    await waitFor(() => expect(result.current.canForward).toBe(true))

    element.clientWidth = 1500 // the window grew: everything fits now
    act(() => window.dispatchEvent(new Event('resize')))
    expect(result.current).toMatchObject({ canBack: false, canForward: false })

    element.clientWidth = 500
    element.scrollLeft = 700 // moved by code, no scroll event
    act(() => result.current.refresh())
    expect(result.current).toMatchObject({ canBack: true, canForward: true })
  })

  it('pages by one screenful in either direction', () => {
    const element = fakeScroller()
    const { result } = renderPager(element)

    result.current.page(1)
    result.current.page(-1)

    expect(element.scrollBy.mock.calls).toEqual([
      [{ left: 500, behavior: 'smooth' }],
      [{ left: -500, behavior: 'smooth' }],
    ])
  })

  it('does nothing without a scroller, and stops listening when unmounted', () => {
    const { result } = renderHook(() => useHorizontalPager())
    expect(() => result.current.page(1)).not.toThrow()
    act(() => result.current.refresh())
    expect(result.current).toMatchObject({ canBack: false, canForward: false })

    const element = fakeScroller()
    const removed = vi.spyOn(element, 'removeEventListener')
    const { unmount } = renderPager(element)
    unmount()
    expect(removed).toHaveBeenCalledWith('scroll', expect.any(Function))
  })
})
