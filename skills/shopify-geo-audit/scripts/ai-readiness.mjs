#!/usr/bin/env node
/**
 * Layer 1 of the GEO audit: can an AI search system read this store at all?
 *
 * Everything here is deterministic. Same store, same run, same findings. It
 * answers the mechanical half of "why don't assistants recommend my products":
 * are the crawlers that feed AI answers allowed in, and is there anything for
 * them to read once they arrive.
 *
 * It deliberately does NOT ask an assistant anything. That is layer 2, and it
 * lives in SKILL.md because it runs through the agent's own search tool.
 *
 * Usage:
 *   node ai-readiness.mjs <domain> [--products 3] [--json]
 *
 * Output: human-readable by default, `--json` for the structured findings the
 * skill turns into a report.
 *
 * Requests go to the audited store and nowhere else.
 */

import { argv, exit } from 'node:process'

const UA = 'Mozilla/5.0 (compatible; ai-readiness-skill/1.0; +https://github.com/maxbuildog/skills)'
const TIMEOUT_MS = 15000
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROBOTS_BYTES = 512 * 1024

/**
 * The crawlers that decide whether a store can be *cited* in an AI answer.
 * Blocking one of these is why a store goes missing from assistants.
 */
const RETRIEVAL_CRAWLERS = [
  { ua: 'OAI-SearchBot', who: 'ChatGPT search' },
  { ua: 'PerplexityBot', who: 'Perplexity' },
  { ua: 'Claude-SearchBot', who: 'Claude search' },
  { ua: 'Applebot-Extended', who: 'Apple Intelligence' },
  { ua: 'meta-externalagent', who: 'Meta AI' }
]

/**
 * Training crawlers. Blocking these keeps a store out of future model weights
 * but does NOT remove it from AI answers, which are retrieved live. Reported
 * separately and at low severity on purpose: most tools conflate the two and
 * scare merchants into changes that cost them nothing and gain them nothing.
 */
const TRAINING_CRAWLERS = [
  { ua: 'GPTBot', who: 'OpenAI model training' },
  { ua: 'CCBot', who: 'Common Crawl' },
  { ua: 'anthropic-ai', who: 'Anthropic model training' }
]

const SEVERITY = { CRITICAL: 'CRITICAL', WARNING: 'WARNING', OPPORTUNITY: 'OPPORTUNITY', INFO: 'INFO' }

// --------------------------------------------------------------------------
// fetching
// --------------------------------------------------------------------------

async function get (url) {
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: '*/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
    const reader = res.body?.getReader()
    if (!reader) return { ok: res.ok, status: res.status, url: res.url, body: '' }

    // Cap the read rather than trusting content-length, which can lie.
    const chunks = []
    let size = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > MAX_BYTES) { await reader.cancel(); break }
      chunks.push(value)
    }
    return {
      ok: res.ok,
      status: res.status,
      url: res.url,
      body: Buffer.concat(chunks).toString('utf8')
    }
  } catch (e) {
    return { ok: false, status: 0, url, body: '', error: e.name === 'TimeoutError' ? 'timeout' : String(e.message || e) }
  }
}

// --------------------------------------------------------------------------
// robots.txt
// --------------------------------------------------------------------------

/**
 * Parses robots.txt into { userAgent -> [{ allow, path }] }.
 *
 * Wildcards are expanded by literal segment matching rather than by building a
 * regex from user input: a hostile robots.txt full of `*` is a known way to
 * hang a single-threaded parser.
 */
function parseRobots (text) {
  const groups = new Map()
  let current = []
  let lastWasUserAgent = false

  for (const rawLine of text.slice(0, MAX_ROBOTS_BYTES).split(/\r?\n/)) {
    const line = rawLine.split('#')[0].trim()
    if (!line) continue
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const field = line.slice(0, idx).trim().toLowerCase()
    const value = line.slice(idx + 1).trim()

    if (field === 'user-agent') {
      if (!lastWasUserAgent) current = []
      current.push(value.toLowerCase())
      for (const ua of current) if (!groups.has(ua)) groups.set(ua, [])
      lastWasUserAgent = true
      continue
    }
    lastWasUserAgent = false
    if (field !== 'allow' && field !== 'disallow') continue
    for (const ua of current) groups.get(ua)?.push({ allow: field === 'allow', path: value })
  }
  return groups
}

/** Google's matching semantics: `*` is any run of characters, `$` anchors the end. */
function pathMatches (pattern, path) {
  if (pattern === '') return false
  if (!pattern.includes('*') && !pattern.endsWith('$')) return path.startsWith(pattern)

  let p = pattern
  const anchored = p.endsWith('$')
  if (anchored) p = p.slice(0, -1)

  const segments = p.split('*')
  let pos = 0
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (seg === '') continue
    const found = i === 0 ? (path.startsWith(seg) ? 0 : -1) : path.indexOf(seg, pos)
    if (found === -1) return false
    pos = found + seg.length
  }
  return anchored ? pos === path.length : true
}

/**
 * Is `path` allowed for `ua`? Longest matching rule wins; Allow wins ties.
 * A named group replaces the `*` group entirely, it does not merge with it.
 */
function isAllowed (groups, ua, path) {
  const rules = groups.get(ua.toLowerCase()) ?? groups.get('*')
  if (!rules || rules.length === 0) return { allowed: true, rule: null, viaWildcard: !groups.has(ua.toLowerCase()) }

  let best = null
  for (const rule of rules) {
    if (!pathMatches(rule.path, path)) continue
    if (!best || rule.path.length > best.path.length || (rule.path.length === best.path.length && rule.allow)) {
      best = rule
    }
  }
  return {
    allowed: best ? best.allow : true,
    rule: best,
    viaWildcard: !groups.has(ua.toLowerCase())
  }
}

// --------------------------------------------------------------------------
// HTML and JSON-LD
// --------------------------------------------------------------------------

/**
 * Extracts every Product node from the page's JSON-LD.
 *
 * Two guards learned the hard way, both of which cause false "broken schema"
 * reports when missing: an empty ld+json block is a theme placeholder that an
 * app fills in later, not a defect; and some themes emit raw control
 * characters that break a first parse but survive a cleaned retry.
 */
function extractProducts (html) {
  const out = []
  let invalid = 0
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw || (!raw.includes('{') && !raw.includes('['))) continue // placeholder, not a defect

    let parsed = null
    try {
      parsed = JSON.parse(raw)
    } catch {
      try {
        parsed = JSON.parse(raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' '))
      } catch {
        invalid++
        continue
      }
    }

    const stack = [parsed]
    while (stack.length) {
      const node = stack.pop()
      if (!node || typeof node !== 'object') continue
      if (Array.isArray(node)) { stack.push(...node); continue }
      if (Array.isArray(node['@graph'])) stack.push(...node['@graph'])
      const type = node['@type']
      const types = Array.isArray(type) ? type : [type]
      if (types.includes('Product') || types.includes('ProductGroup')) out.push(node)
    }
  }
  return { products: out, invalid }
}

const stripTags = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const metaContent = (html, name) => {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i')
  const tag = re.exec(html)?.[0]
  return tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] ?? null : null
}

const firstOffer = (product) => {
  const offers = product.offers
  if (!offers) return null
  return Array.isArray(offers) ? offers[0] ?? null : offers
}

/** Stable, spread selection: products.json ordering shifts on every update. */
function pickSpread (items, want) {
  const sorted = [...items].sort((a, b) => String(a.handle).localeCompare(String(b.handle)))
  if (sorted.length <= want) return sorted
  const step = sorted.length / want
  return Array.from({ length: want }, (_, i) => sorted[Math.floor(i * step)])
}

/**
 * Free items (gifts with purchase, samples, packaging options) are published
 * products but they are not what the store sells, and they are routinely
 * noindexed and left without a description on purpose. Auditing one and
 * reporting it as a defect is how a report loses a merchant's trust on the
 * first line. They are dropped from the sample unless there is nothing else.
 */
function sellableProducts (products) {
  const sellable = products.filter((p) => Number(p.variants?.[0]?.price ?? 0) > 0)
  return sellable.length > 0 ? sellable : products
}

/**
 * Every way a price can legitimately appear in rendered text.
 * Deliberately generous: this feeds a check that only fires when the price is
 * *absent*, so a loose match keeps the check conservative.
 */
function priceForms (raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return []
  const fixed = n.toFixed(2)
  const short = String(n)
  const whole = String(Math.trunc(n))
  const forms = new Set([fixed, short, whole])
  for (const f of [fixed, short]) forms.add(f.replace('.', ',')) // fr, de, es formatting
  return [...forms]
}

/** Collapses the spacing variants themes use inside prices and numbers. */
const normaliseForPrice = (text) => text.replace(/[   \s]/g, '')

/**
 * Does the rendered text contain the product's name? Compared on significant
 * words rather than a raw substring: themes reorder titles, insert the brand,
 * and escape punctuation differently than the JSON feed does.
 */
function nameAppears (title, text) {
  const words = String(title).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length > 3)
  if (words.length === 0) return true // nothing distinctive to look for, stay silent
  const haystack = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')
  const hits = words.filter((w) => haystack.includes(w)).length
  return hits / words.length >= 0.6
}

// --------------------------------------------------------------------------
// the audit
// --------------------------------------------------------------------------

async function audit (domain, wantProducts) {
  const origin = `https://${domain}`
  const findings = []
  const checked = []
  const skipped = []
  const add = (code, severity, detail, evidence) => findings.push({ code, severity, detail, evidence })

  // --- reachable at all? ---------------------------------------------------
  const home = await get(origin + '/')
  if (!home.ok) {
    return {
      store: origin,
      reachable: false,
      error: home.error || `HTTP ${home.status}`,
      findings: [],
      checked: [],
      skipped: ['everything: the storefront could not be fetched']
    }
  }
  if (/<title>[^<]*password/i.test(home.body) || home.url.includes('/password')) {
    return { store: origin, reachable: false, error: 'storefront is password-protected', findings: [], checked: [], skipped: ['everything: the storefront is behind a password'] }
  }

  // --- robots.txt: who is allowed to read this store ------------------------
  const robots = await get(origin + '/robots.txt')
  if (robots.ok && robots.body) {
    checked.push('robots.txt rules for AI crawlers')
    const groups = parseRobots(robots.body)

    const blockedRetrieval = []
    for (const c of RETRIEVAL_CRAWLERS) {
      const verdict = isAllowed(groups, c.ua, '/products/example-product')
      if (!verdict.allowed) blockedRetrieval.push({ ...c, rule: verdict.rule, viaWildcard: verdict.viaWildcard })
    }
    if (blockedRetrieval.length > 0) {
      add('ai_search_crawler_blocked', SEVERITY.CRITICAL,
        `robots.txt blocks ${blockedRetrieval.length} of the ${RETRIEVAL_CRAWLERS.length} crawlers that fetch pages to answer shopping questions: ${blockedRetrieval.map((b) => `${b.ua} (${b.who})`).join(', ')}. These assistants cannot read a product page they are not allowed to fetch, so the store cannot be recommended.`,
        blockedRetrieval.map((b) => `${b.ua}: ${b.rule.allow ? 'Allow' : 'Disallow'}: ${b.rule.path}${b.viaWildcard ? ' (inherited from the User-agent: * group)' : ''}`))
    }

    const ge = isAllowed(groups, 'Google-Extended', '/products/example-product')
    if (!ge.allowed) {
      add('google_extended_blocked', SEVERITY.WARNING,
        'robots.txt opts the store out of Google-Extended, which is what feeds AI Overviews and Gemini grounding. Normal Google Search ranking is unaffected, but the store is excluded from AI answers on the largest surface there is.',
        [`Google-Extended: Disallow: ${ge.rule?.path}${ge.viaWildcard ? ' (inherited from the User-agent: * group)' : ''}`])
    }

    const blockedTraining = TRAINING_CRAWLERS.filter((c) => !isAllowed(groups, c.ua, '/products/example-product').allowed)
    if (blockedTraining.length > 0) {
      add('ai_training_crawler_blocked', SEVERITY.INFO,
        `robots.txt blocks ${blockedTraining.map((b) => b.ua).join(', ')}. These crawlers collect data for model training, not for answering live questions, so this does not affect whether the store gets recommended today. Reported so it is not confused with the finding above.`,
        blockedTraining.map((b) => b.ua))
    }
  } else {
    skipped.push('robots.txt: could not be fetched, so crawler access is unknown')
  }

  // --- llms.txt ------------------------------------------------------------
  const llms = await get(origin + '/llms.txt')
  checked.push('/llms.txt')
  if (!llms.ok || !llms.body.trim() || /<html/i.test(llms.body.slice(0, 400))) {
    add('no_llms_txt', SEVERITY.OPPORTUNITY,
      'No /llms.txt. It is a young convention and no assistant is known to require it, so this is upside rather than a defect: a short plain-text summary of what the store sells, who it is for, and which pages matter is cheap to publish and is exactly the context an assistant lacks.',
      null)
  }

  // --- product pages -------------------------------------------------------
  const feed = await get(`${origin}/products.json?limit=250`)
  let products = []
  try {
    products = JSON.parse(feed.body)?.products ?? []
  } catch { /* handled below */ }

  if (!feed.ok || products.length === 0) {
    skipped.push('product pages: /products.json returned nothing usable, so no product page could be inspected. Either the store is not on Shopify, or the endpoint is blocked.')
    return { store: origin, reachable: true, findings, checked, skipped, pages: [] }
  }

  const candidates = sellableProducts(products)
  const sample = pickSpread(candidates, wantProducts)
  const droppedFree = products.length - candidates.length
  checked.push(`${sample.length} product page${sample.length === 1 ? '' : 's'}, spread across a catalogue of ${products.length}${droppedFree > 0 ? ` (${droppedFree} free item${droppedFree === 1 ? '' : 's'} such as gifts and samples excluded from the sample)` : ''}`)

  const pages = []
  const seen = new Map()

  for (const product of sample) {
    const url = `${origin}/products/${product.handle}`
    const page = await get(url)
    if (!page.ok) { skipped.push(`${url}: HTTP ${page.status || page.error}`); continue }

    const html = page.body
    const text = stripTags(html)
    const { products: ldProducts, invalid } = extractProducts(html)
    const ld = ldProducts[0] ?? null
    const offer = ld ? firstOffer(ld) : null

    const issues = []
    const flag = (code, severity, detail, evidence) => {
      issues.push({ code, severity, detail, evidence })
      // Reported once at store level, on the first page that shows it, then
      // counted so the report can say how much of the sample is affected. One
      // page out of four is a different problem from four out of four.
      const known = seen.get(code)
      if (known) { known.pages++; return }
      const finding = { code, severity, detail, evidence: [url, ...(evidence ? [evidence] : [])], pages: 1 }
      seen.set(code, finding)
      findings.push(finding)
    }

    // Is the product readable without running JavaScript? Crawlers that feed
    // AI answers do not all render, and the ones that do, do it late.
    const title = String(product.title || '')
    const nameInHtml = nameAppears(title, text)
    const forms = priceForms(product.variants?.[0]?.price)
    const haystack = normaliseForPrice(text)
    const priceInHtml = forms.length === 0 || forms.some((f) => haystack.includes(normaliseForPrice(f)))

    // Only fires when the *name* is missing, or when both name and price are.
    // A price alone can be absent for reasons that are not a rendering problem
    // (member pricing, "add to cart to see price", currency switchers), and a
    // wrong critical costs more than a missed one.
    if (!nameInHtml) {
      const missing = priceInHtml ? 'product name' : 'product name and price'
      flag('product_content_js_only', SEVERITY.CRITICAL,
        `The ${missing} cannot be found in the HTML the server returns; it appears only once JavaScript has run. A crawler that does not execute scripts sees a page with nothing to quote, so the product cannot be cited in an answer.`,
        `server HTML is ${html.length.toLocaleString('en-US')} bytes, rendered text ${text.length.toLocaleString('en-US')} chars, ${missing} absent`)
    } else if (!priceInHtml && !ld) {
      // No price in the HTML *and* no schema to carry it: nothing anywhere
      // states what this product costs.
      flag('price_not_in_server_html', SEVERITY.WARNING,
        'The price is in neither the server-rendered HTML nor any structured data, so nothing on this page states what the product costs before JavaScript runs. Price is the most requested attribute in shopping questions.',
        `feed price ${product.variants?.[0]?.price}, not found in ${text.length.toLocaleString('en-US')} chars of rendered text`)
    }

    if (invalid > 0 && !ld) {
      flag('invalid_jsonld', SEVERITY.CRITICAL, `${invalid} JSON-LD block${invalid === 1 ? '' : 's'} on the page cannot be parsed even after cleaning control characters. Anything inside is invisible to every consumer of structured data.`, null)
    }

    if (!ld) {
      flag('no_product_schema', SEVERITY.CRITICAL,
        'No Product structured data. This is the machine-readable version of the page: name, price, availability, brand, reviews. Without it an assistant has to guess from prose, and it usually prefers a competitor that did not make it guess.',
        null)
    } else {
      if (!offer?.price && !offer?.lowPrice) flag('no_price', SEVERITY.CRITICAL, 'The Product schema carries no price. Price is the single most requested attribute in shopping questions.', null)
      if (!offer?.availability) flag('no_availability', SEVERITY.WARNING, 'The Product schema declares no availability. An assistant that cannot tell whether an item is in stock tends to leave it out of a recommendation.', null)
      if (!ld.aggregateRating && !ld.review) flag('no_rating', SEVERITY.OPPORTUNITY, 'No rating or reviews in the schema. Assistants lean on ratings to rank options against each other, and a product with none is easy to skip.', null)
      if (!ld.brand) flag('no_brand_in_schema', SEVERITY.OPPORTUNITY, 'No brand in the Product schema. Brand is how an assistant connects the product to what it knows about the seller.', null)
      if (!ld.gtin && !ld.gtin13 && !ld.gtin12 && !ld.mpn && !ld.sku) flag('no_identifiers', SEVERITY.INFO, 'No GTIN, MPN or SKU. Identifiers are how the same product is matched across sources, which is what lets an assistant compare offers.', null)
    }

    const robotsMeta = (metaContent(html, 'robots') || '').toLowerCase()
    if (robotsMeta.includes('noindex')) {
      flag('noindex_pdp', SEVERITY.CRITICAL, 'The page carries a noindex directive, so it is kept out of the search indexes that AI answers are retrieved from. Nothing else on this page matters until that is removed.', `<meta name="robots" content="${robotsMeta}">`)
    }
    if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
      flag('no_canonical', SEVERITY.WARNING, 'No canonical URL. Variant and filter URLs then compete with each other, and the authority that should make one page citable is split across several.', null)
    }
    if (!metaContent(html, 'description')) {
      flag('meta_desc_missing', SEVERITY.INFO, 'No meta description. It is often the snippet a retrieval system quotes when it summarises the page.', null)
    }

    const bodyText = stripTags(String(product.body_html || ''))
    if (bodyText.length < 200) {
      flag('thin_product_description', SEVERITY.WARNING,
        `The product description is ${bodyText.length} characters. Assistants answer questions such as "which one is good for sensitive skin" by reading the description; a page that states no attributes cannot match any specific question.`,
        `${bodyText.length} characters of description`)
    }

    pages.push({ url, hasSchema: Boolean(ld), issues: issues.map((i) => i.code) })
  }

  return { store: origin, reachable: true, findings, checked, skipped, pages }
}

// --------------------------------------------------------------------------
// cli
// --------------------------------------------------------------------------

const args = argv.slice(2).filter((a) => !a.startsWith('--'))
const asJson = argv.includes('--json')
const wantIdx = argv.indexOf('--products')
const wantProducts = wantIdx !== -1 ? Math.min(10, Math.max(1, Number(argv[wantIdx + 1]) || 3)) : 3

if (args.length === 0) {
  console.error('usage: node ai-readiness.mjs <domain> [--products 3] [--json]')
  exit(1)
}

const domain = args[0].replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '').toLowerCase()
if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
  console.error(`not a domain: ${args[0]}`)
  exit(1)
}

const result = await audit(domain, wantProducts)

if (asJson) {
  console.log(JSON.stringify(result, null, 2))
  exit(result.reachable ? 0 : 2)
}

if (!result.reachable) {
  console.error(`could not audit ${result.store}: ${result.error}`)
  exit(2)
}

const order = ['CRITICAL', 'WARNING', 'OPPORTUNITY', 'INFO']
const sorted = [...result.findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
const counts = order.map((s) => `${sorted.filter((f) => f.severity === s).length} ${s.toLowerCase()}`).join(', ')

const sampled = result.pages.length

console.log(`\n${result.store} — AI readiness\n${counts}\n`)
for (const f of sorted) {
  const scope = f.pages ? `  (${f.pages} of ${sampled} sampled page${sampled === 1 ? '' : 's'})` : ''
  console.log(`[${f.severity}] ${f.code}${scope}`)
  console.log(`  ${f.detail}`)
  if (f.evidence) for (const e of [].concat(f.evidence)) console.log(`  evidence: ${e}`)
  console.log()
}
console.log('checked: ' + (result.checked.join('; ') || 'nothing'))
if (result.skipped.length) console.log('not checked: ' + result.skipped.join('; '))
