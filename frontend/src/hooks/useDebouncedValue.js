import { useEffect, useState } from 'react'

/** `value`, but only after it stopped changing for `delay` ms (e.g. search-as-you-type). */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
