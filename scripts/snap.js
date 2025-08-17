// Simple screenshot script using Puppeteer
// 1) Builds and previews the app
// 2) Seeds demo data into localStorage
// 3) Takes screenshots of key pages/sections

import puppeteer from 'puppeteer'
import { spawn } from 'child_process'
import fs from 'fs'
import readline from 'readline'

const delay = (ms) => new Promise(r => setTimeout(r, ms))
async function waitForServer(url, timeout = 30000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url)
      if (res.ok) return true
    } catch {}
    await delay(500)
  }
  throw new Error('Preview server not ready at ' + url)
}

const run = (cmd, args, opts) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts })
  p.on('close', code => code === 0 ? resolve(0) : reject(new Error(cmd + ' failed')))
})

async function ensureServer() {
  await run('npm', ['run', 'build'])
  const preview = spawn('npm', ['run', 'preview'], { shell: true })
  const rl = readline.createInterface({ input: preview.stdout })
  let url = ''
  rl.on('line', line => {
    const m = /http:\/\/localhost:\d+\/?/.exec(line)
    if (m) url = m[0]
  })
  const start = Date.now()
  while (!url && Date.now() - start < 20000) { await delay(200) }
  if (!url) url = 'http://localhost:4173/'
  return { proc: preview, url }
}

function demoState() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const pad = (n) => String(n).padStart(2, '0')
  const addMonth = (y, m, add) => { const d = new Date(y, m - 1 + add, 1); return { y: d.getFullYear(), m: d.getMonth() + 1 } }
  const m4 = addMonth(year, month, 3)

  // Target monthly picture:
  // - Month 1: OK (positive end balance) with starting bank buffer
  // - Month 2: Net negative pushes bank below zero
  // - Month 3: Loan matures (termMonths = 2 from current month), outflow drops, recovery begins
  // - Month 4: One-time income tops up further
  return {
    settings: { bankStart: 300, month, year },
    incomes: [
      { id: 'inc1', name: 'Paycheck 1', amount: 2000, day: 1 },
      { id: 'inc2', name: 'Paycheck 2', amount: 1200, day: 15 }
    ],
    incomeModifiers: [ { effectiveISO: `${year}-01-01`, percent: 0 } ],
    oneTimeIncomes: [
      // Arrives in month 4
      { id: 'ot1', name: 'Bonus', type: 'Bonus', amount: 1200, dateISO: `${m4.y}-${pad(m4.m)}-10` }
    ],
    liabilities: [
      { id:'rent', name:'Rent', type:'Living Expense', amount:2800, day:3, source:'Bank', frequency:'exact' },
      { id:'water', name:'Water', type:'Utility', amount:50, day:7, source:'Bank', frequency:'exact' },
      { id:'netflix', name:'Netflix', type:'Subscription', amount:16, day:10, source:'Bank', frequency:'exact' },
      // Matures in month 3: origination is current month, termMonths=2 (charges stop after maturity day)
      { id:'carloan', name:'Car Loan', type:'Loan', amount:350, day:12, source:'Bank', frequency:'exact', loan:{ originationISO:`${year}-${pad(month)}-01`, termMonths:2, rate:0.049, originalAmount:15000 } },
      // Card-charged spending
      { id:'groceries', name:'Groceries', type:'Living Expense', amount:300, day:5, source:'chase', frequency:'exact' },
      { id:'gas', name:'Gas', type:'Living Expense', amount:40, day:9, source:'chase', frequency:'weekly' },
      { id:'spotify', name:'Spotify', type:'Subscription', amount:11, day:8, source:'cap1', frequency:'exact' }
    ],
    cards: [
      { id:'chase', name:'Chase United', apr:0.2499, dueDay:15, carryPct:0.25, startBalance:1500, minPct:0.03, creditLimit:6000, overLimitAdhocPct:1 },
      { id:'cap1', name:'Capital One', apr:0.2499, dueDay:12, carryPct:0.10, startBalance:800, minPct:0.03, creditLimit:4000, overLimitAdhocPct:1 }
    ],
  }
}

async function seedLocalStorage(page, url) {
  const state = demoState()
  // Seed before any document loads so the app reads it on first boot
  await page.evaluateOnNewDocument((st) => {
    try { window.localStorage.setItem('budget-sim-v1', JSON.stringify(st)) } catch {}
  }, state)
  await page.goto(url, { waitUntil: 'networkidle0' })
  // sanity check in page
  const ok = await page.evaluate(() => !!localStorage.getItem('budget-sim-v1'))
  if (!ok) console.warn('Warning: demo state not present in localStorage after navigation')
}

async function ensureDir() {
  await fs.promises.mkdir('docs/images', { recursive: true }).catch(()=>{})
  await fs.promises.mkdir('docs/demo', { recursive: true }).catch(()=>{})
}

async function clickByText(page, selector, text) {
  const els = await page.$$(selector)
  for (const el of els) {
    const t = (await page.evaluate(e => e.textContent || '', el)).trim()
    if (t.includes(text)) { await el.click(); return true }
  }
  return false
}

async function snap() {
  try {
    await ensureDir()
    const { proc, url } = await ensureServer()
    const browser = await puppeteer.launch({ headless: 'new' })
    const page = await browser.newPage()
    page.setViewport({ width: 1400, height: 900 })

    // Load and seed demo data
    await seedLocalStorage(page, url)

    // Dashboard (Sankey compact)
    try { await page.waitForSelector('.recharts-responsive-container', { timeout: 8000 }) } catch {}
    await page.screenshot({ path: 'docs/images/dashboard-sankey.png' })

    // Expand all for detailed Sankey
    await clickByText(page, 'button', 'Expand all')
    await delay(800)
    await page.screenshot({ path: 'docs/images/dashboard-sankey-detail.png' })

    // Daily detail section (scroll)
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await delay(500)
    await page.screenshot({ path: 'docs/images/daily-detail.png' })

    // Liabilities tab
    await clickByText(page, 'button', 'Liabilities')
    await delay(500)
    await page.screenshot({ path: 'docs/images/liabilities.png' })

    // Income tab
    await clickByText(page, 'button', 'Income')
    await delay(500)
    await page.screenshot({ path: 'docs/images/income.png' })

    // Write demo dataset to docs/demo for sharing
    const demo = demoState()
    await fs.promises.writeFile('docs/demo/demo-budget.json', JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), data: demo }, null, 2))

    await browser.close()
    proc.kill('SIGTERM')
  } catch (err) {
    console.error('Snapshot failed:', err)
    process.exit(1)
  }
}

snap().catch(err => { console.error(err); process.exit(1) })
