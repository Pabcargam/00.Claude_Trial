import { useId, useState } from 'react'
import { placeLabel } from './format'
import { MIN_QUERY_LENGTH, useLocationSearch } from './useWeather'
import styles from './Weather.module.css'

/**
 * Location autocomplete (WAI-ARIA combobox): type 2+ letters, then pick a suggestion with the
 * mouse or with ↑/↓ + Enter. Escape closes the list. `onSelect` receives the location.
 */
export default function LocationSearch({ onSelect }) {
  const listId = useId()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const search = useLocationSearch(text)
  const options = search.data ?? []
  const showList = open && search.enabled && text.trim().length >= MIN_QUERY_LENGTH

  function choose(location) {
    onSelect(location)
    setText('')
    setOpen(false)
    setActive(-1)
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      setOpen(false)
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!options.length) return
      setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((current) => (current + step + options.length) % options.length)
    } else if (event.key === 'Enter' && showList && options[active]) {
      event.preventDefault()
      choose(options[active])
    }
  }

  let status = null
  if (showList) {
    if (search.isError) status = 'Location search is unavailable right now. Try again later.'
    else if (search.isPending) status = 'Searching…'
    else if (!options.length && !search.isPlaceholderData) status = 'No places found.'
  }

  return (
    <div className={styles.search}>
      <input
        type="search"
        role="combobox"
        aria-label="Search a location"
        aria-autocomplete="list"
        aria-expanded={showList && options.length > 0}
        aria-controls={listId}
        aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Search a city or town…"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setOpen(true)
          setActive(-1)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => setOpen(false)}
      />
      {showList && options.length > 0 && !search.isError && (
        <ul id={listId} role="listbox" aria-label="Locations" className={styles.options}>
          {options.map((location, index) => (
            <li
              key={location.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={styles.option}
              // mousedown, not click: picking must happen before the input's blur closes the list
              onMouseDown={(event) => {
                event.preventDefault()
                choose(location)
              }}
              onMouseEnter={() => setActive(index)}
            >
              {placeLabel(location)}
            </li>
          ))}
        </ul>
      )}
      {status && (
        <p role="status" className={styles.searchStatus}>
          {status}
        </p>
      )}
    </div>
  )
}
