import { displayName } from './displayName'

describe('displayName', () => {
  it('uses the first name when there is one', () => {
    expect(displayName({ first_name: ' Pablo ', email: 'p.cardenal@example.com' })).toBe('Pablo')
  })

  it.each([
    ['empty first name', ''],
    ['blank first name', '   '],
    ['missing first name', undefined],
  ])('falls back to the email before the "@" (%s)', (_case, firstName) => {
    expect(displayName({ first_name: firstName, email: 'p.cardenal@example.com' })).toBe(
      'p.cardenal',
    )
  })
})
