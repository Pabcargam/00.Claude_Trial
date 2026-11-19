import { dayLabel, degrees, longDate, percent, placeLabel, weatherEmoji } from './format'

describe('weather formatting', () => {
  it('joins the non-empty, distinct parts of a place', () => {
    expect(placeLabel({ name: 'Seville', admin1: 'Andalusia', country: 'Spain' })).toBe(
      'Seville, Andalusia, Spain',
    )
    expect(placeLabel({ name: 'Madrid', admin1: 'Madrid', country: 'Spain' })).toBe('Madrid, Spain')
    expect(placeLabel({ name: 'Nowhere', admin1: '', country: '' })).toBe('Nowhere')
  })

  it('maps icon keys to emoji, with a fallback for unknown ones', () => {
    expect(weatherEmoji('clear')).toBe('☀️')
    expect(weatherEmoji('thunderstorm')).toBe('⛈️')
    expect(weatherEmoji('unknown')).toBe('❔')
    expect(weatherEmoji(undefined)).toBe('❔')
  })

  it('never shows a sun at night', () => {
    expect(weatherEmoji('clear', false)).toBe('🌙')
    expect(weatherEmoji('partly-cloudy', false)).toBe('☁️')
    expect(weatherEmoji('drizzle', false)).toBe('🌧️')
    expect(weatherEmoji('showers', false)).toBe('🌧️')
    // No sun in these anyway: the same by day and by night.
    for (const icon of ['cloudy', 'fog', 'rain', 'freezing-rain', 'snow', 'thunderstorm']) {
      expect(weatherEmoji(icon, false)).toBe(weatherEmoji(icon, true))
    }
    expect(weatherEmoji('unknown', false)).toBe('❔')
    expect(weatherEmoji('clear', true)).toBe('☀️')
  })

  it('rounds temperatures', () => {
    expect(degrees(17.5)).toBe('18°')
    expect(degrees(-0.4)).toBe('0°') // Math.round gives -0, which prints as "0"
  })

  it('shows probabilities with their unit, or a bare dash when missing', () => {
    expect(percent(40, '%')).toBe('40%')
    expect(percent(0, '%')).toBe('0%')
    expect(percent(null, '%')).toBe('–')
    expect(percent(undefined, '%')).toBe('–')
  })

  it('labels days relative to the forecast start', () => {
    expect(dayLabel('2026-11-10', 0)).toBe('Today')
    expect(dayLabel('2026-11-11', 1)).toBe('Tomorrow')
    expect(dayLabel('2026-11-12', 2)).toBe('Thu 12 Nov')
    expect(longDate('2026-11-17')).toBe('Tuesday 17 November')
  })

  it('never shifts a calendar date with the viewer timezone', () => {
    // Midnight-UTC parsing would show "Sunday 31 December 2023" west of Greenwich.
    expect(longDate('2024-01-01')).toBe('Monday 1 January')
  })
})
