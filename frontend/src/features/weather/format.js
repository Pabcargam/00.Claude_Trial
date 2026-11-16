/** "Seville, Andalusia, Spain": the non-empty parts of a location, without repeats. */
export function placeLabel({ name, admin1, country }) {
  return [...new Set([name, admin1, country].filter(Boolean))].join(', ')
}
