// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { occursOn, resolveCardId } from '../lib/simulate'

describe('helpers', () => {
  it('occursOn exact day', () => {
    const liab = { day: 10, frequency: 'exact' }
    expect(occursOn(liab, 9, 31)).toBe(false)
    expect(occursOn(liab, 10, 31)).toBe(true)
  })

  it('occursOn daily', () => {
    const liab = { day: 1, frequency: 'daily' }
    expect(occursOn(liab, 1, 31)).toBe(true)
    expect(occursOn(liab, 31, 31)).toBe(true)
  })

  it('occursOn every other day anchored to day', () => {
    const liab = { day: 2, frequency: 'everyOtherDay' }
    expect(occursOn(liab, 2, 31)).toBe(true)
    expect(occursOn(liab, 3, 31)).toBe(false)
    expect(occursOn(liab, 4, 31)).toBe(true)
  })

  it('occursOn weekly anchored to day', () => {
    const liab = { day: 3, frequency: 'weekly' }
    expect(occursOn(liab, 3, 31)).toBe(true)
    expect(occursOn(liab, 10, 31)).toBe(true)
    expect(occursOn(liab, 11, 31)).toBe(false)
  })

  it('occursOn annual specified month/day', () => {
    const liab = { day: 10, month: 8, frequency: 'annual' }
    expect(occursOn(liab, 10, 31, 2025, 8)).toBe(true)
    expect(occursOn(liab, 10, 31, 2025, 7)).toBe(false)
  })

  it('resolveCardId by id and name', () => {
    const cards = [{ id:'c1', name:'Card One' }, { id:'c2', name:'Card Two' }]
    expect(resolveCardId('c1', cards)).toBe('c1')
    expect(resolveCardId('Card Two', cards)).toBe('c2')
    expect(resolveCardId('unknown', cards)).toBeNull()
  })
})
