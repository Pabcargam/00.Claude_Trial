/**
 * Rain warnings for outdoor tasks, from a day's chance of rain (Pablo's two levels):
 * "possible" from 30%, "likely" from 60%. Each level has its own label and emoji, so the
 * warning never depends on colour alone.
 */
export const RAIN_POSSIBLE = 30
export const RAIN_LIKELY = 60

export const RAIN_LEVELS = {
  possible: { label: 'Possible rain', emoji: '🌦️' },
  likely: { label: 'Rain likely', emoji: '🌧️' },
}

/** 'likely' | 'possible' | null (dry enough, or no probability known). */
export function rainLevel(probability) {
  if (probability == null) return null
  if (probability >= RAIN_LIKELY) return 'likely'
  if (probability >= RAIN_POSSIBLE) return 'possible'
  return null
}
