#!/usr/bin/env node
/**
 * Layer 1 of the AI answer audit: can an AI answer engine read this site at all,
 * and is there anything machine-readable for it to quote?
 *
 * Everything here is deterministic. Same URL, same run, same findings. It answers
 * the mechanical half of "why don't assistants cite my pages": are the crawlers
 * that feed AI answers allowed in, and once they arrive is there structured,
 * server-rendered, answer-shaped content for them to read.
 *
 * It deliberately does NOT ask an assistant anything. That is layer 2, and it
 * lives in SKILL.md because it runs through the agent's own search tool.
 *
 * Works on any website. It knows nothing about any single platform: it samples
 * real pages from the sitemap (or from the home page's own links when there is
 * no sitemap) and inspects the HTML the server actually returns.
 *
 * Usage:
 *   node ai-answer-audit.mjs <url> [--pages 5] [--json]
 *
 * Output: human-readable by default, `--json` for the structured findings the
 * skill turns into a report.
 *
 * Requests go to the audited site and nowhere else.
 */

import { argv, exit } from 'node:process'

const UA = 'Mozilla/5.0 (compatible; ai-answer-audit-skill/1.0; +https://github.com/maxbuildog/skills)'
const TIMEOUT_MS = 15000
const MAX_BYTES = 5 * 1024 * 1024
const MAX_ROBOTS_BYTES = 512 * 1024
const MAX_SITEMAP_URLS = 2000

/**
 * The crawlers that decide whether a page can be *cited* in an AI answer.
 * Blocking one of these is why a site goes missing from assistants' answers.
 */
const RETRIEVAL_CRAWLERS = [
  { ua: 'OAI-SearchBot', who: 'ChatGPT search' },
  { ua: 'PerplexityBot', who: 'Perplexity' },
  { ua: 'Claude-SearchBot', who: 'Claude search' },
  { ua: 'Applebot-Extended', who: 'Apple Intelligence' },
  { ua: 'meta-externalagent', who: 'Meta AI' }
]

/**
 * Training crawlers. Blocking these keeps a site out of future model weights but
 * does NOT remove it from AI answers, which are retrieved live. Reported
 * separately and at low severity on purpose: most tools conflate the two and
 * scare owners into changes that cost them nothing and gain them nothing.
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
 * Extracts every JSON-LD node and the set of schema.org @type values on a page.
 *
 * Two guards learned the hard way, both of which cause false "broken schema"
 * reports when missing: an empty ld+json block is a theme placeholder that an
 * app fills in later, not a defect; and some templates emit raw control
 * characters that break a first parse but survive a cleaned retry.
 */
function extractJsonLd (html) {
  const types = new Set()
  const nodes = []
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
        parsed = JSON.parse(raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' '))
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
      const t = node['@type']
      for (const one of (Array.isArray(t) ? t : [t])) if (one) types.add(String(one))
      nodes.push(node)
    }
  }
  return { types, nodes, invalid }
}

const stripTags = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const metaContent = (html, name) => {
  const re = new RegExp(`<meta[^>]+name=["']${name}["'][^>]*>`, 'i')
  const tag = re.exec(html)?.[0]
  return tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] ?? null : null
}

const metaProperty = (html, prop) => {
  const re = new RegExp(`<meta[^>]+property=["']${prop}["'][^>]*>`, 'i')
  const tag = re.exec(html)?.[0]
  return tag ? /content=["']([^"']*)["']/i.exec(tag)?.[1] ?? null : null
}

/** Every heading's plain text, in document order. */
function headings (html) {
  const out = []
  const re = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi
  let m
  while ((m = re.exec(html)) !== null) out.push({ level: Number(m[1]), text: stripTags(m[2]) })
  return out
}

/** Stable, spread selection so the sample does not shift run to run. */
function pickSpread (items, want) {
  const sorted = [...new Set(items)].sort((a, b) => String(a).localeCompare(String(b)))
  if (sorted.length <= want) return sorted
  const step = sorted.length / want
  return Array.from({ length: want }, (_, i) => sorted[Math.floor(i * step)])
}

// --------------------------------------------------------------------------
// discovering pages to sample
// --------------------------------------------------------------------------

const locsFrom = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1])

/** Keep same-origin URLs, drop non-content assets. */
function cleanUrls (urls, origin) {
  return urls
    .filter((u) => u === origin || u.startsWith(origin + '/'))
    .filter((u) => !/\.(jpe?g|png|gif|webp|svg|pdf|css|js|xml|gz|ico|zip|mp4|woff2?)($|\?)/i.test(u))
}

const homeLinks = (homeHtml, origin) =>
  [...homeHtml.matchAll(/<a[^>]+href=["']([^"'#?]+)["']/gi)]
    .map((m) => { try { return new URL(m[1], origin + '/').toString() } catch { return null } })
    .filter(Boolean)

/** Reads sample URLs from one sitemap, following one level of sitemap index. */
async function readSitemap (smUrl, origin) {
  const sm = await get(smUrl)
  if (!(sm.ok && /<(urlset|sitemapindex)/i.test(sm.body))) return null
  let locs = locsFrom(sm.body)
  // A sitemap index points at other sitemaps: follow the first couple of
  // plain-XML children. Gzipped children are skipped, and the home-page
  // fallback covers a site that only ships those.
  if (/<sitemapindex/i.test(sm.body)) {
    const children = locs.filter((u) => /\.xml($|\?)/i.test(u)).slice(0, 2)
    locs = []
    for (const child of children) {
      const c = await get(child)
      if (c.ok) locs.push(...locsFrom(c.body))
    }
  }
  return cleanUrls(locs, origin)
}

/**
 * Finds URLs to sample. Prefers the sitemaps declared in robots.txt, then the
 * default /sitemap.xml, and falls back to same-origin links on the home page
 * whenever the sitemap is absent, gzipped, or yields nothing usable. Always
 * same origin, always deduplicated, never the endless list a big sitemap can be.
 */
async function discoverUrls (origin, homeHtml, robotsBody = '') {
  // robots.txt is the canonical place a site declares where its sitemaps live;
  // many large sites keep them there and not at /sitemap.xml.
  const declared = [...robotsBody.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1])
  const candidates = [...declared, `${origin}/sitemap.xml`]

  let hasSitemap = false
  let urls = []
  for (const smUrl of candidates.slice(0, 3)) {
    const locs = await readSitemap(smUrl, origin)
    if (locs === null) continue
    hasSitemap = true
    urls.push(...locs)
    if (urls.length) break
  }

  // Absent, gzipped or empty sitemap: use the links the home page exposes.
  if (urls.length === 0) urls = cleanUrls(homeLinks(homeHtml, origin), origin)

  return { urls: urls.slice(0, MAX_SITEMAP_URLS), hasSitemap }
}

// --------------------------------------------------------------------------
// the audit
// --------------------------------------------------------------------------

async function audit (input, wantPages) {
  let target
  try { target = new URL(input.includes('://') ? input : `https://${input}`) } catch {
    return { site: input, reachable: false, error: 'not a valid URL', findings: [], checked: [], skipped: ['everything: the URL could not be parsed'] }
  }
  const origin = target.origin
  const findings = []
  const checked = []
  const skipped = []
  const add = (code, severity, detail, evidence) => findings.push({ code, severity, detail, evidence, pages: null })

  // --- reachable at all? ---------------------------------------------------
  const home = await get(origin + '/')
  if (!home.ok) {
    return {
      site: origin,
      reachable: false,
      error: home.error || `HTTP ${home.status}`,
      findings: [],
      checked: [],
      skipped: ['everything: the site could not be fetched']
    }
  }

  // --- robots.txt: who is allowed to read this site ------------------------
  const robots = await get(origin + '/robots.txt')
  if (robots.ok && robots.body) {
    checked.push('robots.txt rules for AI crawlers')
    const groups = parseRobots(robots.body)
    const probe = '/an-example-page'

    const blockedRetrieval = []
    for (const c of RETRIEVAL_CRAWLERS) {
      const verdict = isAllowed(groups, c.ua, probe)
      if (!verdict.allowed) blockedRetrieval.push({ ...c, rule: verdict.rule, viaWildcard: verdict.viaWildcard })
    }
    if (blockedRetrieval.length > 0) {
      add('ai_search_crawler_blocked', SEVERITY.CRITICAL,
        `robots.txt blocks ${blockedRetrieval.length} of the ${RETRIEVAL_CRAWLERS.length} crawlers that fetch pages to answer questions live: ${blockedRetrieval.map((b) => `${b.ua} (${b.who})`).join(', ')}. These assistants cannot read a page they are not allowed to fetch, so the site cannot be cited in their answers.`,
        blockedRetrieval.map((b) => `${b.ua}: ${b.rule.allow ? 'Allow' : 'Disallow'}: ${b.rule.path}${b.viaWildcard ? ' (inherited from the User-agent: * group)' : ''}`))
    }

    const ge = isAllowed(groups, 'Google-Extended', probe)
    if (!ge.allowed) {
      add('google_extended_blocked', SEVERITY.WARNING,
        'robots.txt opts the site out of Google-Extended, which is what feeds AI Overviews and Gemini grounding. Normal Google Search ranking is unaffected, but the site is excluded from AI answers on the largest surface there is.',
        [`Google-Extended: Disallow: ${ge.rule?.path}${ge.viaWildcard ? ' (inherited from the User-agent: * group)' : ''}`])
    }

    const blockedTraining = TRAINING_CRAWLERS.filter((c) => !isAllowed(groups, c.ua, probe).allowed)
    if (blockedTraining.length > 0) {
      add('ai_training_crawler_blocked', SEVERITY.INFO,
        `robots.txt blocks ${blockedTraining.map((b) => b.ua).join(', ')}. These crawlers collect data for model training, not for answering live questions, so this does not affect whether the site gets cited today. Reported so it is not confused with the finding above.`,
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
      'No /llms.txt. It is a young convention and no assistant is known to require it, so this is upside rather than a defect: a short plain-text summary of what the site is about, who it is for, and which pages matter is cheap to publish and is exactly the context an assistant otherwise lacks.',
      null)
  }

  // --- discover pages to sample --------------------------------------------
  const { urls, hasSitemap } = await discoverUrls(origin, home.body, robots.ok ? robots.body : '')
  checked.push(hasSitemap ? 'sitemap.xml' : 'internal links on the home page (no sitemap.xml found)')
  if (!hasSitemap) {
    add('no_sitemap', SEVERITY.WARNING,
      'No sitemap.xml. It is the list a search or AI crawler reads to know which pages exist; without it, discovery falls back to following links, and deep or new pages are found late or not at all.',
      null)
  }

  // The exact page the user pointed at is always sampled, then the home page,
  // then a spread of discovered pages, deduplicated and capped.
  const inputUrl = target.toString()
  const seeds = inputUrl === origin + '/' ? [origin + '/'] : [inputUrl, origin + '/']
  const sample = [...seeds, ...pickSpread(urls, wantPages)]
    .filter((u, i, a) => a.indexOf(u) === i)
    .slice(0, wantPages)
  checked.push(`${sample.length} page${sample.length === 1 ? '' : 's'}${urls.length ? `, spread across ${urls.length} discovered URL${urls.length === 1 ? '' : 's'}` : ''}`)

  const seen = new Map()
  let read = 0

  for (const url of sample) {
    const page = url === origin + '/' ? home : await get(url)
    if (!page.ok) { skipped.push(`${url}: HTTP ${page.status || page.error}`); continue }
    read++

    const html = page.body
    const text = stripTags(html)
    const words = text ? text.split(' ').filter(Boolean).length : 0
    const { types, invalid } = extractJsonLd(html)
    const hs = headings(html)

    // Reported once at site level, on the first page that shows it, then counted
    // so the report can say how much of the sample is affected. One page out of
    // five is a different problem from five out of five.
    const flag = (code, severity, detail, evidence) => {
      const known = seen.get(code)
      if (known) { known.pages++; return }
      const finding = { code, severity, detail, evidence: [url, ...(evidence ? [].concat(evidence) : [])], pages: 1 }
      seen.set(code, finding)
      findings.push(finding)
    }

    // Is there anything to quote without running JavaScript? Retrieval crawlers
    // do not all render, and the ones that do, do it late. A large HTML payload
    // that strips down to almost no text is the signature of a page whose body
    // only exists after client-side JavaScript runs.
    if (words < 40 && html.length > 12000) {
      flag('content_js_only', SEVERITY.CRITICAL,
        'The page returns very little readable text in its server HTML; the body appears only once JavaScript has run. A crawler that does not execute scripts sees a page with nothing to quote, so it cannot be cited in an answer.',
        `server HTML is ${html.length.toLocaleString('en-US')} bytes, rendered text only ${text.length.toLocaleString('en-US')} chars`)
    } else if (words < 120) {
      flag('thin_content', SEVERITY.WARNING,
        `The page carries about ${words} words of readable text. Answer engines quote specific sentences; a page that states little has little that can be lifted into an answer.`,
        `${words} words of rendered text`)
    }

    const robotsMeta = (metaContent(html, 'robots') || '').toLowerCase()
    if (robotsMeta.includes('noindex')) {
      flag('noindex', SEVERITY.CRITICAL, 'The page carries a noindex directive, so it is kept out of the search indexes that AI answers are retrieved from. Nothing else on this page matters until that is removed.', `<meta name="robots" content="${robotsMeta}">`)
    }

    if (invalid > 0 && types.size === 0) {
      flag('invalid_jsonld', SEVERITY.CRITICAL, `${invalid} JSON-LD block${invalid === 1 ? '' : 's'} on the page cannot be parsed even after cleaning control characters. Anything inside is invisible to every consumer of structured data.`, null)
    } else if (types.size === 0) {
      flag('no_structured_data', SEVERITY.WARNING,
        'No JSON-LD structured data of any kind. Structured data is the machine-readable version of the page: what it is, who wrote it, when, what it is about. Without it an assistant has to infer everything from prose, and it tends to prefer a source that did not make it guess.',
        null)
    }

    if (!/<title[^>]*>\s*\S/i.test(html)) {
      flag('no_title', SEVERITY.WARNING, 'No non-empty <title>. The title is the first label every index and every assistant uses to decide what the page is about.', null)
    }
    if (!/<link[^>]+rel=["']canonical["']/i.test(html)) {
      flag('no_canonical', SEVERITY.WARNING, 'No canonical URL. Tracking, filter and variant URLs then compete with each other, and the authority that should make one page citable is split across several.', null)
    }
    if (!metaContent(html, 'description')) {
      flag('meta_desc_missing', SEVERITY.INFO, 'No meta description. It is often the snippet a retrieval system quotes when it summarises the page in a list of sources.', null)
    }
    if (!hs.some((h) => h.level === 1)) {
      flag('no_h1', SEVERITY.WARNING, 'No H1 heading. The H1 is the plainest statement of what the page answers; without it, the page structure gives an assistant no single topic to anchor on.', null)
    }

    // Answer-shape checks: only on pages that read like content, so a thin
    // landing or category page is not scolded for lacking an author or a date.
    const isContent = words > 400 || /<article[\s>]/i.test(html) ||
      [...types].some((t) => /Article|BlogPosting|NewsArticle|FAQPage|QAPage|HowTo|Report|ScholarlyArticle/i.test(t))

    if (isContent) {
      const hasQa = [...types].some((t) => /FAQPage|QAPage/i.test(t)) || hs.some((h) => h.text.trim().endsWith('?'))
      if (!hasQa) {
        flag('no_qa_structure', SEVERITY.OPPORTUNITY,
          'The page reads like content but exposes no question-and-answer structure: no FAQPage schema and no question-shaped headings. Answer engines lift answers most readily from a clear "question, then a direct answer" block.',
          null)
      }
      const hasDate = /datePublished|dateModified/i.test(html) || /<time[^>]+datetime=/i.test(html) || metaProperty(html, 'article:published_time')
      if (!hasDate) {
        flag('no_dates', SEVERITY.OPPORTUNITY,
          'No published or modified date is exposed, in the schema, a <time> element, or a meta tag. Assistants favour content they can tell is current, and drop what they cannot date.',
          null)
      }
      const hasAuthor = [...types].some((t) => /Person/i.test(t)) || /"author"\s*:/i.test(html) ||
        metaContent(html, 'author') || /rel=["']author["']/i.test(html) || metaProperty(html, 'article:author')
      if (!hasAuthor) {
        flag('no_author', SEVERITY.OPPORTUNITY,
          'No author is exposed on a content page. Named authorship is one of the signals assistants and search systems use to judge whether a source is trustworthy enough to cite.',
          null)
      }
    }
  }

  return { site: origin, reachable: true, findings, checked, skipped, sampled: read }
}

// --------------------------------------------------------------------------
// cli
// --------------------------------------------------------------------------

const positional = argv.slice(2).filter((a) => !a.startsWith('--'))
const asJson = argv.includes('--json')
const pagesIdx = argv.indexOf('--pages')
const wantPages = pagesIdx !== -1 ? Math.min(10, Math.max(1, Number(argv[pagesIdx + 1]) || 5)) : 5

if (positional.length === 0) {
  console.error('usage: node ai-answer-audit.mjs <url> [--pages 5] [--json]')
  exit(1)
}

const result = await audit(positional[0], wantPages)

if (asJson) {
  console.log(JSON.stringify(result, null, 2))
  exit(result.reachable ? 0 : 2)
}

if (!result.reachable) {
  console.error(`could not audit ${result.site}: ${result.error}`)
  exit(2)
}

const order = ['CRITICAL', 'WARNING', 'OPPORTUNITY', 'INFO']
const sorted = [...result.findings].sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity))
const counts = order.map((s) => `${sorted.filter((f) => f.severity === s).length} ${s.toLowerCase()}`).join(', ')

console.log(`\n${result.site}: AI answer readiness\n${counts}\n`)
for (const f of sorted) {
  const scope = f.pages ? `  (${f.pages} of ${result.sampled} sampled page${result.sampled === 1 ? '' : 's'})` : ''
  console.log(`[${f.severity}] ${f.code}${scope}`)
  console.log(`  ${f.detail}`)
  if (f.evidence) for (const e of [].concat(f.evidence)) console.log(`  evidence: ${e}`)
  console.log()
}
console.log('checked: ' + (result.checked.join('; ') || 'nothing'))
if (result.skipped.length) console.log('not checked: ' + result.skipped.join('; '))
