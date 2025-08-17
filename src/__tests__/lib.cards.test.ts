// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { cardMinPayment, overLimitAdhoc } from '../lib/cards'

describe('cards helpers', () => {
  it('cardMinPayment uses minPct when carryPct=1', () => {
    const res = cardMinPayment(1000, 1, 0.03)
    expect(res).toBeCloseTo(30, 2)
  })

  it('cardMinPayment pays down to carry when larger than min', () => {
    const res = cardMinPayment(1000, 0.8, 0.03)
    expect(res).toBeCloseTo(200, 2)
  })

  it('cardMinPayment enforces $25 minimum', () => {
    const res = cardMinPayment(500, 1, 0.02)
    expect(res).toBeCloseTo(25, 2)
  })

  it('overLimitAdhoc returns overage times pct', () => {
    expect(overLimitAdhoc(600, 500, 1)).toBeCloseTo(100, 2)
    expect(overLimitAdhoc(600, 500, 0.5)).toBeCloseTo(50, 2)
  })

  it('overLimitAdhoc returns 0 when at/below limit or no limit', () => {
    expect(overLimitAdhoc(500, 500, 1)).toBe(0)
    expect(overLimitAdhoc(400, 500, 1)).toBe(0)
    expect(overLimitAdhoc(400, 0, 1)).toBe(0)
  })
})
