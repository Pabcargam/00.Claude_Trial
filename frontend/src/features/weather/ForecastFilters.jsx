const RANGES = [
  { days: 1, label: 'Today' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
]

/** Today / 3 days / 1 week. Only slices the loaded forecast: no new request. */
export default function ForecastFilters({ days, onChange }) {
  return (
    <div role="group" aria-label="Forecast range" className="segmented">
      {RANGES.map((range) => (
        <button
          key={range.days}
          type="button"
          aria-pressed={days === range.days}
          onClick={() => onChange(range.days)}
        >
          {range.label}
        </button>
      ))}
    </div>
  )
}
