import { rainLevel } from './rain'

describe('rain levels', () => {
  it.each([
    [0, null],
    [29, null],
    [30, 'possible'],
    [59, 'possible'],
    [60, 'likely'],
    [100, 'likely'],
    [null, null],
    [undefined, null],
  ])('%s%% chance → %s', (probability, level) => {
    expect(rainLevel(probability)).toBe(level)
  })
})
