// @ts-nocheck
import { describe, it, expect } from 'vitest'
import { simulate, simulateHorizon } from '../lib/simulate'

const baseState = () => ({
  settings: { year: 2025, month: 8, bankStart: 0 },
  liabilities: [], incomes: [], cards: [], incomeModifiers: [], oneTimeIncomes: []
})

describe('simulate advanced scenarios', () => {
  it('posts monthly CC interest on due day only and pays min', () => {
    const s = baseState()
    s.settings.bankStart = 1000
    s.cards.push({ id:'c1', name:'Card1', apr: 0.12, dueDay: 10, carryPct: 1, startBalance: 1000, minPct: 0.03, creditLimit: 5000, overLimitAdhocPct: 0 })
    const res = simulate(s)
    const interestDays = res.days.filter(d => Object.keys(d.ccInterest||{}).length>0)
    expect(interestDays).toHaveLength(1)
    const d10 = res.days.find(d=>d.day===10)
    expect(d10.ccInterest['c1']).toBeGreaterThan(0)
    expect(d10.ccPayments['c1']).toBeGreaterThan(0)
  })

  it('over-limit adhoc payment brings balance down and reduces bank', () => {
    const s = baseState()
    s.settings.bankStart = 50
    s.cards.push({ id:'c1', name:'Card1', apr: 0.2, dueDay: 20, carryPct: 1, startBalance: 600, minPct: 0.03, creditLimit: 500, overLimitAdhocPct: 1 })
    const res = simulate(s)
    const d1 = res.days[0]
    expect(d1.ccPayments['c1']).toBeCloseTo(100, 2)
    expect(d1.bankOut).toBeGreaterThanOrEqual(100)
  })

  it('loan maturity emits green row data and stops future charges', () => {
    const s = baseState()
    s.settings.bankStart = 0
    s.liabilities.push({ id:'loan1', name:'Car', type:'Loan', amount: 200, day: 5, source:'Bank', loan: { originationISO:'2025-08-01', termMonths: 0, originalAmount: 10000, rate: 0.06 } })
    const res = simulate(s)
    const d5 = res.days.find(d=>d.day===5)
    expect(d5.loanMaturities?.length||0).toBe(1)
    const d6 = res.days.find(d=>d.day===6)
    // No more bank outflow for this loan on subsequent same-month days
    // BankOut may be >0 due to other events, but bankOutPlanned should not include this loan amount on day 6
    expect(d6.bankOutPlanned).toBeLessThan(200)
  })

  it('loan maturity across months stops next month', () => {
    const s = baseState()
    s.settings.bankStart = 0
    s.liabilities.push({ id:'loan1', name:'Car', type:'Loan', amount: 200, day: 5, source:'Bank', loan: { originationISO:'2025-08-01', termMonths: 1, originalAmount: 10000, rate: 0.06 } })
    const h = simulateHorizon(s, 2)
    const m2 = h.months[1]
    const d5m2 = m2.days.find(d=>d.day===5)
    expect(d5m2.loanMaturities?.length||0).toBe(1)
    const d6m2 = m2.days.find(d=>d.day===6)
    expect(d6m2.bankOutPlanned).toBeLessThan(200)
  })

  it('applies income raises from effective date forward', () => {
    const s = baseState()
    s.settings.bankStart = 0
    s.incomes.push({ id:'i1', name:'Pay1', amount: 100, day: 1 })
    s.incomes.push({ id:'i2', name:'Pay2', amount: 100, day: 15 })
    s.incomeModifiers.push({ effectiveISO: '2025-08-10', percent: 3 })
    const res = simulate(s)
    const d1 = res.days.find(d=>d.day===1)
    const d15 = res.days.find(d=>d.day===15)
    expect(d1.bankIn).toBeCloseTo(100, 2)
    expect(d15.bankIn).toBeCloseTo(100*1.03, 2)
  })

  it('applies one-time incomes on the specified date', () => {
    const s = baseState()
    s.oneTimeIncomes.push({ id:'ot1', name:'Bonus', type:'Bonus', amount: 500, dateISO:'2025-08-20' })
    const res = simulate(s)
    const d20 = res.days.find(d=>d.day===20)
    expect(d20.bankIn).toBeCloseTo(500, 2)
  })

  it('marks underfunded when bank negative during the day', () => {
    const s = baseState()
    s.settings.bankStart = 0
    s.liabilities.push({ id:'b1', name:'Big Bill', type:'Living Expense', amount: 100, day: 1, source:'Bank' })
    const res = simulate(s)
    expect(res.days[0].underfunded).toBe(true)
  })
})
