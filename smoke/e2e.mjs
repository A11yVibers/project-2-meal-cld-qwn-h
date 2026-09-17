// Temporary end-to-end driver: talks CDP to headless Chrome, exercises the
// app UI, verifies persistence across a reload, captures screenshots.
import fs from 'node:fs'

const CDP_HTTP = 'http://127.0.0.1:9222'
const APP_URL = 'http://127.0.0.1:4321/'
const SHOTS = '/tmp/cc-shots'
fs.mkdirSync(SHOTS, { recursive: true })

const targets = await (await fetch(`${CDP_HTTP}/json/list`)).json()
const page = targets.find((t) => t.type === 'page')
if (!page) throw new Error('no page target')

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => {
  ws.onopen = res
  ws.onerror = rej
})

let msgId = 0
const pending = new Map()
const consoleErrors = []
const exceptions = []

ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    if (msg.error) reject(new Error(JSON.stringify(msg.error)))
    else resolve(msg.result)
    return
  }
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
    consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '))
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    exceptions.push(
      msg.params.exceptionDetails?.exception?.description ||
        msg.params.exceptionDetails?.text ||
        'unknown exception',
    )
  }
}

const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    msgId += 1
    pending.set(msgId, { resolve, reject })
    ws.send(JSON.stringify({ id: msgId, method, params }))
  })

async function evaluate(expression, { awaitPromise = true } = {}) {
  const res = await send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  if (res.exceptionDetails) {
    throw new Error(
      `evaluate failed: ${res.exceptionDetails.exception?.description || res.exceptionDetails.text}\n  in: ${expression.slice(0, 200)}`,
    )
  }
  return res.result.value
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function screenshot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(`${SHOTS}/${name}.png`, Buffer.from(data, 'base64'))
}

let passed = 0
function check(ok, label) {
  if (!ok) throw new Error(`CHECK FAILED: ${label}`)
  passed += 1
  console.log(`  ok  ${label}`)
}

// ---- boot -------------------------------------------------------------------
await send('Runtime.enable')
await send('Page.enable')
await send('Log.enable')
await send('Page.navigate', { url: APP_URL })
await sleep(1200)
// Start from a clean slate so repeat runs are deterministic.
await evaluate(`localStorage.clear(); true`)
await send('Page.navigate', { url: APP_URL })
await sleep(1500)

// ---- catalog ------------------------------------------------------------------
console.log('Catalog:')
const catalog = await evaluate(`(async () => {
  const wait = (sel, t = 5000) => new Promise((res, rej) => {
    const t0 = Date.now()
    const iv = setInterval(() => {
      if (document.querySelector(sel)) { clearInterval(iv); res() }
      else if (Date.now() - t0 > t) { clearInterval(iv); rej(new Error('timeout ' + sel)) }
    }, 50)
  })
  await wait('.recipe-card')
  const cards = [...document.querySelectorAll('.recipe-card')]
  return {
    count: cards.length,
    titles: cards.map(c => c.querySelector('.recipe-card-title')?.textContent),
    hasImg: cards.every(c => !!c.querySelector('img.thumb')),
    meta: cards.map(c => c.querySelector('.recipe-card-meta')?.textContent),
    badges: [...document.querySelectorAll('.recipe-card .pill')].map(p => p.textContent),
  }
})()`)
check(catalog.count === 2, `2 seed recipes shown (${catalog.count})`)
check(
  catalog.titles.includes('Honey Garlic Salmon Bowls') &&
    catalog.titles.includes('Creamy Chickpea Spinach Pasta'),
  'seed titles rendered from CSV',
)
check(catalog.hasImg, 'each card shows an image')
check(catalog.badges.includes('High-protein') && catalog.badges.includes('Vegetarian'), 'dietary pills rendered')
await screenshot('01-catalog')

// filtering
const filterResult = await evaluate(`(async () => {
  const input = document.querySelector('.filters input[type=search]')
  const setVal = (el, v) => {
    const proto = Object.getPrototypeOf(el)
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    setter.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
  setVal(input, 'salmon')
  await new Promise(r => setTimeout(r, 200))
  const n1 = document.querySelectorAll('.recipe-card').length
  setVal(input, '')
  await new Promise(r => setTimeout(r, 200))
  const n2 = document.querySelectorAll('.recipe-card').length
  return { n1, n2 }
})()`)
check(filterResult.n1 === 1 && filterResult.n2 === 2, 'search filter works')

// ---- detail -------------------------------------------------------------------
console.log('Recipe detail:')
const detail = await evaluate(`(async () => {
  document.querySelector('.recipe-card').click()
  await new Promise(r => setTimeout(r, 300))
  const wait = (sel, t = 3000) => new Promise((res, rej) => {
    const t0 = Date.now()
    const iv = setInterval(() => {
      if (document.querySelector(sel)) { clearInterval(iv); res() }
      else if (Date.now() - t0 > t) { clearInterval(iv); rej(new Error('timeout ' + sel)) }
    }, 50)
  })
  await wait('.detail-hero')
  return {
    title: document.querySelector('.detail-hero h2')?.textContent,
    sections: [...document.querySelectorAll('.ingredient-section .section-name')].map(e => e.textContent),
    ingredientRows: document.querySelectorAll('.ingredient-row').length,
    steps: document.querySelectorAll('.step-row').length,
    stats: [...document.querySelectorAll('.stat')].map(s => s.textContent),
    hasOptionsMenu: !!document.querySelector('.options-menu-trigger'),
    firstQty: document.querySelector('.ingredient-qty')?.textContent,
  }
})()`)
check(detail.title === 'Honey Garlic Salmon Bowls', 'detail title')
check(detail.sections.join(',') === 'Main,Sauce,Vegetables', `sections from CSV (${detail.sections})`)
check(detail.ingredientRows === 8, `8 ingredient rows (${detail.ingredientRows})`)
check(detail.steps === 5, '5 method steps')
check(detail.hasOptionsMenu, 'recipe options menu present')
check(detail.firstQty === '1½ lb', `first qty formatted (${detail.firstQty})`)
check(detail.stats.some((s) => s.includes('Spice')), 'spice level stat shown')

// options menu: toggle nutrition + metric
const opts = await evaluate(`(async () => {
  document.querySelector('.options-menu-trigger').click()
  await new Promise(r => setTimeout(r, 150))
  const rows = [...document.querySelectorAll('.option-row')]
  const nutritionRow = rows.find(r => r.textContent.includes('Show nutrition'))
  nutritionRow.click()
  await new Promise(r => setTimeout(r, 250))
  const metricRadio = [...document.querySelectorAll('.unit-option')].find(u => u.textContent.includes('Metric'))
  metricRadio.click()
  await new Promise(r => setTimeout(r, 250))
  const panel = document.querySelector('.nutrition-panel')
  const qtyNow = document.querySelector('.ingredient-qty')?.textContent
  const checkedStates = rows.map(r => r.querySelector('.option-check')?.classList.contains('checked'))
  document.querySelector('.options-menu-trigger').click()
  return {
    hasNutrition: !!panel,
    nutrition: panel?.textContent?.slice(0, 120),
    qtyNow, checkedStates,
  }
})()`)
check(opts.hasNutrition, 'nutrition panel appears when toggled on')
check(opts.qtyNow === '681 g', `metric conversion applied (${opts.qtyNow})`)
// Rows: [meal-plan suggestions, include-in-shopping, show nutrition, substitutions]
check(
  opts.checkedStates[0] === true && opts.checkedStates[1] === true &&
  opts.checkedStates[2] === true && opts.checkedStates[3] === false,
  `option rows show checked state (${JSON.stringify(opts.checkedStates)})`,
)

// back to US for the shopping check later + close menu
await evaluate(`(async () => {
  document.querySelector('.options-menu-trigger').click()
  await new Promise(r => setTimeout(r, 150))
  const usRadio = [...document.querySelectorAll('.unit-option')].find(u => u.textContent.includes('US'))
  usRadio.click()
  await new Promise(r => setTimeout(r, 200))
  document.body.click()
  await new Promise(r => setTimeout(r, 100))
  return true
})()`)
await screenshot('02-detail')

// add to plan from detail
const added = await evaluate(`(async () => {
  const planBtn = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add to meal plan'))
  planBtn.click()
  await new Promise(r => setTimeout(r, 250))
  const modal = document.querySelector('.modal')
  if (!modal) return { modal: false }
  const confirm = [...modal.querySelectorAll('.btn-primary')].pop()
  confirm.click()
  await new Promise(r => setTimeout(r, 350))
  return { modal: true, note: document.querySelector('.planned-note')?.textContent?.slice(0, 90) }
})()`)
check(added.modal && /In the plan/.test(added.note || ''), 'added to plan from detail view; note shown')

// ---- planner ------------------------------------------------------------------
console.log('Planner:')
const planner = await evaluate(`(async () => {
  const nav = [...document.querySelectorAll('.nav-btn')].find(b => b.textContent.includes('Meal planner'))
  nav.click()
  await new Promise(r => setTimeout(r, 350))
  const cells = document.querySelectorAll('.planner-cell').length
  const dayHeads = document.querySelectorAll('.planner-dayhead').length
  const slotHeads = [...document.querySelectorAll('.planner-slothead')].map(e => e.textContent)
  const cards = [...document.querySelectorAll('.plan-card .plan-title')].map(e => e.textContent)
  return { cells, dayHeads, slotHeads, cards }
})()`)
check(planner.cells === 28, `28 slot cells (${planner.cells})`)
check(planner.dayHeads === 7, '7 day headers')
check(planner.slotHeads.join(',') === 'Breakfast,Lunch,Dinner,Snack', '4 meal slots')
check(planner.cards.includes('Honey Garlic Salmon Bowls'), 'planned recipe visible in planner')
await screenshot('03-planner')

// assign via empty-slot picker
const picker = await evaluate(`(async () => {
  const empty = document.querySelector('.plan-empty')
  empty.click()
  await new Promise(r => setTimeout(r, 300))
  const rows = [...document.querySelectorAll('.picker-row')]
  const suggested = document.querySelector('.picker-section-label')?.textContent
  const target = rows.find(r => r.textContent.includes('Chickpea'))
  if (!target) return { rows: rows.length, suggested, picked: false }
  target.click()
  await new Promise(r => setTimeout(r, 300))
  const cards = [...document.querySelectorAll('.plan-card .plan-title')].map(e => e.textContent)
  return { rows: rows.length, suggested, picked: true, cards }
})()`)
check(picker.rows >= 1 && picker.picked, 'recipe picker opens on empty slot and assigns')
check(picker.cards.length === 2, `2 cards planned now (${picker.cards.length})`)
check(/Suggested/i.test(picker.suggested), `suggestions section shown first (${picker.suggested})`)

// replace the salmon card with the pasta recipe, then remove it again
const replaceRemove = await evaluate(`(async () => {
  const salmonCard = [...document.querySelectorAll('.plan-card')].find(c => c.textContent.includes('Salmon'))
  salmonCard.querySelector('.plan-card-actions .icon-btn').click()
  await new Promise(r => setTimeout(r, 300))
  const row = [...document.querySelectorAll('.picker-row')].find(r => r.textContent.includes('Chickpea'))
  row.click()
  await new Promise(r => setTimeout(r, 300))
  const afterReplace = [...document.querySelectorAll('.plan-card .plan-title')].map(e => e.textContent)
  // two pasta cards now (Mon Breakfast + Wed Dinner); remove the Wed Dinner one
  const cards = document.querySelectorAll('.plan-card')
  cards[1].querySelector('.plan-card-actions .danger-text').click()
  await new Promise(r => setTimeout(r, 300))
  const afterRemove = [...document.querySelectorAll('.plan-card .plan-title')].map(e => e.textContent)
  return { afterReplace, afterRemove }
})()`)
check(
  replaceRemove.afterReplace.length === 2 &&
    replaceRemove.afterReplace.every((t) => t === 'Creamy Chickpea Spinach Pasta'),
  `replace swaps the slot's recipe (${replaceRemove.afterReplace})`,
)
check(
  replaceRemove.afterRemove.length === 1 &&
    replaceRemove.afterRemove[0] === 'Creamy Chickpea Spinach Pasta',
  `remove deletes one assignment (${replaceRemove.afterRemove})`,
)

// week navigation
const weekNav = await evaluate(`(async () => {
  const before = document.querySelector('.week-label strong')?.textContent
  const next = [...document.querySelectorAll('.week-nav .icon-btn')][1]
  next.click()
  await new Promise(r => setTimeout(r, 250))
  const mid = document.querySelector('.week-label strong')?.textContent
  const emptyCards = document.querySelectorAll('.plan-card').length
  const prev = [...document.querySelectorAll('.week-nav .icon-btn')][0]
  prev.click()
  await new Promise(r => setTimeout(r, 250))
  const after = document.querySelector('.week-label strong')?.textContent
  const backCards = document.querySelectorAll('.plan-card').length
  return { before, mid, after, emptyCards, backCards }
})()`)
check(weekNav.before !== weekNav.mid && weekNav.mid !== weekNav.after && weekNav.before === weekNav.after, 'week navigation works')
check(weekNav.emptyCards === 0 && weekNav.backCards === 1, 'assignments belong to their week')

// ---- shopping list -------------------------------------------------------------
console.log('Shopping list:')
const shopping = await evaluate(`(async () => {
  const nav = [...document.querySelectorAll('.nav-btn')].find(b => b.textContent.includes('Shopping list'))
  nav.click()
  await new Promise(r => setTimeout(r, 350))
  const cats = [...document.querySelectorAll('.shop-category h3')].map(e => e.textContent.trim())
  const items = [...document.querySelectorAll('.shop-item')].map(e => e.textContent.replace(/\\s+/g, ' ').slice(0, 60))
  return { cats, items }
})()`)
check(shopping.cats.some((c) => c.includes('Canned & jarred')), `categories grouped (${shopping.cats.join(' | ')})`)
check(shopping.items.some((i) => i.includes('Chickpeas')), 'chickpeas on list from planned pasta recipe')

// check off + pantry exclusion
const shopInteract = await evaluate(`(async () => {
  const item = [...document.querySelectorAll('.shop-item')].find(e => e.textContent.includes('Chickpeas'))
  item.querySelector('input[type=checkbox]').click()
  await new Promise(r => setTimeout(r, 250))
  const checked = [...document.querySelectorAll('.shop-item')].some(e => e.classList.contains('checked'))
  // mark garlic as in pantry via the 🥫 button
  const garlic = [...document.querySelectorAll('.shop-item')].find(e => e.textContent.includes('Garlic'))
  let excludedCount = 0
  if (garlic) {
    garlic.querySelector('button.icon-btn').click()
    await new Promise(r => setTimeout(r, 250))
    excludedCount = document.querySelector('.excluded-toggle')?.textContent?.match(/\\((\\d+)\\)/)?.[1] || 0
  }
  const garlicStillThere = [...document.querySelectorAll('.shop-item')].some(e => e.textContent.includes('Garlic'))
  const progress = document.querySelector('.shopping-progress .muted')?.textContent
  return { checked, excludedCount, garlicStillThere, progress }
})()`)
check(shopInteract.checked, 'check-off works')
check(!shopInteract.garlicStillThere && Number(shopInteract.excludedCount) >= 1, 'pantry exclusion removes garlic from list')
await screenshot('04-shopping')

// ---- add recipe form -----------------------------------------------------------
console.log('Add recipe form:')
const formFlow = await evaluate(`(async () => {
  const nav = [...document.querySelectorAll('.nav-btn')].find(b => b.textContent.includes('Recipes'))
  nav.click()
  await new Promise(r => setTimeout(r, 300))
  const addBtn = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add recipe'))
  addBtn.click()
  await new Promise(r => setTimeout(r, 350))
  const setVal = (el, v) => {
    const proto = Object.getPrototypeOf(el)
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    desc.set.call(el, v)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const sections = [...document.querySelectorAll('.form-section h3')].map(e => e.textContent)
  // title
  setVal(document.querySelector('.form-view input[type=text]'), 'E2E Test Curry')
  // servings stepper +
  document.querySelector('.stepper-btn[aria-label="Increase servings"]').click()
  // spice level
  const spice = [...document.querySelectorAll('.spice-btn')].find(b => b.textContent.includes('Very spicy'))
  spice.click()
  // cuisine + meal type
  const selects = document.querySelectorAll('.form-section select')
  setVal(selects[0], 'CU06')
  setVal(selects[1], 'MT03')
  // dietary tag
  const tag = [...document.querySelectorAll('.tag-toggle')].find(b => b.textContent.includes('Gluten-free'))
  tag.click()
  // ingredient: search + pick
  const ingInput = document.querySelector('.ingredient-search input')
  setVal(ingInput, 'chick')
  await new Promise(r => setTimeout(r, 250))
  const opt = [...document.querySelectorAll('.ingredient-option')].find(o => o.textContent.includes('Chickpeas'))
  if (!opt) return { error: 'no ingredient option', sections }
  opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  await new Promise(r => setTimeout(r, 150))
  // unit + qty
  const qty = document.querySelector('.ing-qty')
  setVal(qty, '2')
  const unit = document.querySelector('.ing-unit')
  setVal(unit, 'can')
  // add a second ingredient + section
  const addIng = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add ingredient'))
  addIng.click()
  await new Promise(r => setTimeout(r, 150))
  const addSection = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Add ingredient section'))
  addSection.click()
  await new Promise(r => setTimeout(r, 150))
  const sectionCount = document.querySelectorAll('.ing-section').length
  // step
  setVal(document.querySelector('.step-edit-row textarea'), 'Simmer everything together.')
  const timer = document.querySelector('.timer-input')
  setVal(timer, '20')
  // meal planning: add immediately
  const switches = [...document.querySelectorAll('.switch-row input[type=checkbox]')]
  const addToPlanSwitch = switches[1]
  addToPlanSwitch.click()
  await new Promise(r => setTimeout(r, 200))
  const hasPlanInline = !!document.querySelector('.plan-inline')
  // options menu in form: toggle substitutions + metric
  document.querySelector('.form-view .options-menu-trigger').click()
  await new Promise(r => setTimeout(r, 200))
  const subRow = [...document.querySelectorAll('.options-popover .option-row')].find(r => r.textContent.includes('substitutions'))
  subRow.click()
  await new Promise(r => setTimeout(r, 100))
  document.querySelector('.form-view .options-menu-trigger').click()
  // submit
  const submit = [...document.querySelectorAll('.form-actions .btn-primary')].pop()
  submit.click()
  await new Promise(r => setTimeout(r, 500))
  return {
    sections, sectionCount, hasPlanInline,
    detailTitle: document.querySelector('.detail-hero h2')?.textContent,
    spice: document.querySelector('.detail-view .stat')?.parentElement?.textContent?.includes('Very spicy'),
    subs: document.querySelector('.substitution')?.textContent,
  }
})()`)
check(
  formFlow.sections.join('|') ===
    'Recipe details|Timing & yield|Image & appearance|Ingredients|Method|Meal-planning options|Recipe options',
  `all 7 form sections (${formFlow.sections.join('|')})`,
)
check(formFlow.sectionCount === 2, 'ingredient section added')
check(formFlow.hasPlanInline, 'add-to-plan controls revealed')
check(formFlow.detailTitle === 'E2E Test Curry', 'saved recipe opens in detail view')

const afterCreate = await evaluate(`(async () => {
  const ingText = document.querySelector('.ingredient-list')?.textContent
  const steps = [...document.querySelectorAll('.step-text')].map(e => e.textContent)
  const timer = document.querySelector('.step-timer')?.textContent
  const planned = document.querySelector('.planned-note')?.textContent
  const sub = document.querySelector('.substitution')?.textContent
  return { ingText: ingText?.slice(0, 80), steps, timer, planned: planned?.slice(0, 60), sub }
})()`)
check(/Chickpeas/.test(afterCreate.ingText) && /2 can/.test(afterCreate.ingText), `ingredients saved (${afterCreate.ingText})`)
check(afterCreate.steps[0] === 'Simmer everything together.' && afterCreate.timer === '⏲ 20 min', 'step + timer saved')
check(/In the plan/.test(afterCreate.planned || ''), 'immediately added to meal plan')
check(/Black beans/.test(afterCreate.sub || ''), `substitution shown when allowed (${afterCreate.sub})`)
await screenshot('05-new-recipe-detail')

// catalog shows the new recipe immediately
const catalogNow = await evaluate(`(async () => {
  const back = [...document.querySelectorAll('.btn')].find(b => b.textContent.includes('Back to recipes'))
  back.click()
  await new Promise(r => setTimeout(r, 350))
  return {
    titles: [...document.querySelectorAll('.recipe-card-title')].map(e => e.textContent),
    yourBadges: document.querySelectorAll('.pill-user').length,
  }
})()`)
check(catalogNow.titles.includes('E2E Test Curry'), 'new recipe appears in catalog immediately')
check(catalogNow.yourBadges >= 1, 'user recipe badged')

// ---- persistence ----------------------------------------------------------------
console.log('Persistence after reload:')
await send('Page.reload', { ignoreCache: false })
await sleep(1600)
const persisted = await evaluate(`(async () => {
  const wait = (sel, t = 5000) => new Promise((res, rej) => {
    const t0 = Date.now()
    const iv = setInterval(() => {
      if (document.querySelector(sel)) { clearInterval(iv); res() }
      else if (Date.now() - t0 > t) { clearInterval(iv); rej(new Error('timeout ' + sel)) }
    }, 50)
  })
  await wait('.recipe-card')
  const titles = [...document.querySelectorAll('.recipe-card-title')].map(e => e.textContent)
  const ls = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    ls[k] = localStorage.getItem(k).slice(0, 40)
  }
  return { titles, lsKeys: Object.keys(ls) }
})()`)
check(persisted.titles.includes('E2E Test Curry'), 'user recipe persisted across reload')
check(persisted.titles.length === 3, `3 recipes after reload (${persisted.titles.length})`)

const persistedState = await evaluate(`(async () => {
  // planner state
  const nav = [...document.querySelectorAll('.nav-btn')].find(b => b.textContent.includes('Meal planner'))
  nav.click()
  await new Promise(r => setTimeout(r, 300))
  const cards = [...document.querySelectorAll('.plan-card .plan-title')].map(e => e.textContent)
  // shopping state
  const nav2 = [...document.querySelectorAll('.nav-btn')].find(b => b.textContent.includes('Shopping'))
  nav2.click()
  await new Promise(r => setTimeout(r, 300))
  const checked = [...document.querySelectorAll('.shop-item.checked')].length
  const excluded = document.querySelector('.excluded-toggle')?.textContent || ''
  return { cards, checked, excluded }
})()`)
check(persistedState.cards.length === 2, `meal plan persisted (${persistedState.cards.length} cards: ${persistedState.cards})`)
check(persistedState.checked === 1, 'checked shopping item persisted')
check(/\(\d+\)/.test(persistedState.excluded), `pantry exclusion persisted (${persistedState.excluded})`)
await screenshot('06-shopping-after-reload')

// ---- console hygiene ---------------------------------------------------------------
const realErrors = [...consoleErrors, ...exceptions].filter(
  (e) => !/favicon|net::ERR|Failed to load resource|wikimedia|unsplash/i.test(e),
)
check(realErrors.length === 0, `no console errors/exceptions (${realErrors.join(' ;; ').slice(0, 300)})`)

console.log(`\nE2E PASSED — ${passed} checks`)
ws.close()
process.exit(0)
