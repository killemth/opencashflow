// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { simulate, simulateHorizon } from '../lib/simulate'

const baseState = () => ({
  settings: { year: 2025, month: 8, bankStart: 1000 },
  liabilities: [], incomes: [], cards: [], incomeModifiers: [], oneTimeIncomes: []
})

describe('simulate basics', () => {
  it('handles empty month, bank unchanged', () => {
    const s = baseState()
    const res = simulate(s)
    expect(res.endBank).toBeCloseTo(1000, 2)
    expect(res.days).toHaveLength(31)
  })

  it('applies recurring income and expense on days', () => {
    const s = baseState()
    s.incomes.push({ id:'i1', name:'Pay', amount: 200, day: 1 })
    s.liabilities.push({ id:'l1', name:'Bill', type:'Living Expense', amount: 150, day: 1, source:'Bank' })
    const res = simulate(s)
    const day1 = res.days[0]
    expect(day1.bankIn).toBeCloseTo(200,2)
    expect(day1.bankOut).toBeCloseTo(150,2)
    expect(res.endBank).toBeCloseTo(1000 + 200 - 150, 2)
  })

  it('tracks underfunded intraday correctly', () => {
    const s = baseState()
    s.incomes.push({ id:'i1', name:'Pay', amount: 50, day: 15 })
    s.liabilities.push({ id:'l1', name:'Rent', type:'Living Expense', amount: 1200, day: 1, source:'Bank' })
    const res = simulate(s)
    const day1 = res.days[0]
    expect(day1.underfunded).toBe(true)
  })

  it('carries balances across months', () => {
    const s = baseState()
    s.incomes.push({ id:'i1', name:'Pay', amount: 200, day: 1 })
    const h = simulateHorizon(s, 2)
    expect(h.months).toHaveLength(2)
    expect(h.months[1].endBank).toBeCloseTo(h.months[0].endBank + 200, 2)
  })
})
