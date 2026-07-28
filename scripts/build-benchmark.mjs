#!/usr/bin/env node
/**
 * Rebuilds data/benchmark.json from raw StoreCanary scan results.
 *
 * The benchmark is what makes these skills different from a checklist: when a
 * skill reports an issue, it can also say how common that issue is across a
 * large sample of real stores. That turns "you have X" into "you have X, and so
 * do 62% of stores — here is what the other 38% did".
 *
 * Input:  directories containing `results.json` files produced by the scanner.
 * Output: data/benchmark.json (aggregated, anonymised — no store names).
 *
 * Usage:
 *   node scripts/build-benchmark.mjs <dir> [<dir> ...]
 *
 * Stores are de-duplicated by registrable hostname (www. stripped), so the same
 * store appearing in several scan waves is counted once. Only scans that
 * actually completed (`status: "ok"`) are counted: a store we could not reach
 * tells us nothing about the prevalence of a defect.
 */

import { readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Severity ranking, worst first.
 *
 * Severity is a property of the *instance*, not of the code: the scanner rates
 * the same code differently depending on what it found. `no_product_schema` is
 * CRITICAL when no markup is detectable at all, and WARNING when the markup is
 * there but injected client-side. `noindex_pdp` is CRITICAL on a real product
 * and WARNING on a gift or sample SKU, where hiding the page is usually
 * deliberate.
 *
 * So a code cannot honestly be labelled with a single severity. Collapsing it
 * to the worst one ever seen would advertise `no_product_schema` as CRITICAL on
 * 14% of stores when five out of six of those stores have the mild variant.
 * Each finding therefore carries the full breakdown, and `severity` is the
 * severity that dominates by store count, not the scariest one.
 */
const SEVERITY_ORDER = ['CRITICAL', 'WARNING', 'OPPORTUNITY', 'INFO']

function walkForResults (dir, found = []) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return found
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue
    const full = join(dir, entry)
    let st
    try {
      st = statSync(full)
    } catch {
      continue
    }
    if (st.isDirectory()) walkForResults(full, found)
    else if (entry === 'results.json') found.push(full)
  }
  return found
}

/** `https://www.Example.com/path` -> `example.com` */
function hostKey (storeUrl) {
  try {
    return new URL(storeUrl).hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return String(storeUrl || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  }
}

function worstSeverity (a, b) {
  if (!a) return b
  if (!b) return a
  return SEVERITY_ORDER.indexOf(a) <= SEVERITY_ORDER.indexOf(b) ? a : b
}

const inputDirs = process.argv.slice(2)
if (inputDirs.length === 0) {
  console.error('usage: node scripts/build-benchmark.mjs <dir> [<dir> ...]')
  process.exit(1)
}

const files = inputDirs.flatMap((d) => walkForResults(resolve(d)))
if (files.length === 0) {
  console.error('no results.json found under: ' + inputDirs.join(', '))
  process.exit(1)
}

/** host -> { severityByCode: Map<code, severity>, pdpCount } — one entry per store. */
const stores = new Map()
let skippedNotOk = 0

for (const file of files) {
  let batch
  try {
    batch = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    continue
  }
  if (!Array.isArray(batch)) continue

  for (const scan of batch) {
    if (!scan || typeof scan !== 'object' || !scan.store) continue
    if (scan.status !== 'ok') { skippedNotOk++; continue }

    const key = hostKey(scan.store)
    if (!key) continue

    // Later scans of the same store overwrite earlier ones: we want the most
    // recent picture, not a union of every defect the store ever had.
    const codes = new Map()
    for (const issue of scan.issues || []) {
      if (!issue?.code) continue
      codes.set(issue.code, worstSeverity(codes.get(issue.code), issue.severity))
    }
    for (const pdp of scan.pdps || []) {
      for (const issue of pdp.issues || []) {
        if (!issue?.code) continue
        codes.set(issue.code, worstSeverity(codes.get(issue.code), issue.severity))
      }
    }

    stores.set(key, { codes, pdpCount: (scan.pdps || []).length })
  }
}

const totalStores = stores.size
if (totalStores === 0) {
  console.error('no completed scans found — nothing to aggregate')
  process.exit(1)
}

/** code -> { stores, bySeverity: { CRITICAL: n, ... } } — counted in stores. */
const byCode = new Map()
let storesWithCritical = 0
let storesWithCriticalOrWarning = 0
let storesWithAnyIssue = 0
let totalPdps = 0

for (const { codes, pdpCount } of stores.values()) {
  totalPdps += pdpCount
  if (codes.size > 0) storesWithAnyIssue++
  let hasCritical = false
  let hasWarning = false
  for (const [code, severity] of codes) {
    if (severity === 'CRITICAL') hasCritical = true
    if (severity === 'WARNING') hasWarning = true
    const entry = byCode.get(code) || { stores: 0, bySeverity: {} }
    entry.stores++
    entry.bySeverity[severity] = (entry.bySeverity[severity] || 0) + 1
    byCode.set(code, entry)
  }
  if (hasCritical) storesWithCritical++
  if (hasCritical || hasWarning) storesWithCriticalOrWarning++
}

/** The severity that most stores actually got; ties break towards the worse one. */
function dominantSeverity (bySeverity) {
  return Object.entries(bySeverity).sort(
    (a, b) => b[1] - a[1] || SEVERITY_ORDER.indexOf(a[0]) - SEVERITY_ORDER.indexOf(b[0])
  )[0][0]
}

const findings = [...byCode.entries()]
  .map(([code, { stores: n, bySeverity }]) => {
    const ordered = {}
    for (const s of SEVERITY_ORDER) if (bySeverity[s]) ordered[s] = bySeverity[s]
    return {
      code,
      severity: dominantSeverity(bySeverity),
      severity_breakdown: ordered,
      stores: n,
      prevalence: Math.round((n / totalStores) * 1000) / 10 // one decimal, in %
    }
  })
  .sort((a, b) => b.stores - a.stores)

const benchmark = {
  $schema: './benchmark.schema.json',
  version: 1,
  // Dated on purpose. A fork of this repo carries a benchmark that stops being
  // refreshed the day it is forked, and anyone reading a report can see how old
  // the numbers behind it are.
  generated_at: new Date().toISOString().slice(0, 10),
  generated_from: 'StoreCanary external scans of live Shopify storefronts',
  method: 'Each store is scanned from the outside, the way Googlebot sees it: storefront HTML, JSON-LD, products.json, robots/meta directives, hreflang and certificate. No app, no admin access, no cooperation from the store required. A store is counted once, on its most recent completed scan.',
  sample: {
    stores: totalStores,
    product_pages: totalPdps,
    stores_with_at_least_one_critical: storesWithCritical,
    stores_with_at_least_one_critical_or_warning: storesWithCriticalOrWarning,
    stores_with_at_least_one_finding: storesWithAnyIssue,
    share_with_critical: Math.round((storesWithCritical / totalStores) * 1000) / 10,
    share_with_critical_or_warning: Math.round((storesWithCriticalOrWarning / totalStores) * 1000) / 10,
    incomplete_scans_excluded: skippedNotOk
  },
  caveats: [
    'The sample is a convenience sample of independent DTC Shopify stores, weighted towards the US. It is not a random sample of all Shopify stores.',
    'Prevalence is measured per store, not per product page: a store counts once for a given code no matter how many of its pages are affected.',
    'A store is counted on its most recent completed scan only.',
    'Severity belongs to the instance, not to the code: the same code is rated differently depending on what was found. `severity` is the one that dominates by store count, and `severity_breakdown` gives the full split. Read the breakdown before quoting a code as critical.'
  ],
  findings
}

const serialised = JSON.stringify(benchmark, null, 2) + '\n'

mkdirSync(join(ROOT, 'data'), { recursive: true })
writeFileSync(join(ROOT, 'data', 'benchmark.json'), serialised)

/**
 * `npx skills add owner/repo/skill-name` copies the skill folder and nothing
 * else, so a skill that reads the benchmark from the repo root would break the
 * moment someone installs it on its own. Skills that use it keep their own copy
 * under assets/, and it is synced here so the two can never drift.
 */
const synced = []
const skillsDir = join(ROOT, 'skills')
if (existsSync(skillsDir)) {
  for (const skill of readdirSync(skillsDir)) {
    const skillFile = join(skillsDir, skill, 'SKILL.md')
    if (!existsSync(skillFile)) continue
    if (!readFileSync(skillFile, 'utf8').includes('assets/benchmark.json')) continue
    mkdirSync(join(skillsDir, skill, 'assets'), { recursive: true })
    writeFileSync(join(skillsDir, skill, 'assets', 'benchmark.json'), serialised)
    synced.push(skill)
  }
}

console.log(`benchmark written: ${totalStores} stores, ${totalPdps} product pages, ${findings.length} distinct codes`)
console.log(`  ${storesWithCritical} stores (${benchmark.sample.share_with_critical}%) have at least one CRITICAL`)
console.log(`  ${storesWithCriticalOrWarning} stores (${benchmark.sample.share_with_critical_or_warning}%) have at least one CRITICAL or WARNING`)
console.log('  benchmark copied into skill assets: ' + (synced.join(', ') || 'none'))
console.log(`  source files: ${files.length}, incomplete scans skipped: ${skippedNotOk}`)
console.log('  top 10:')
for (const f of findings.slice(0, 10)) {
  const split = Object.entries(f.severity_breakdown).map(([s, n]) => `${s}:${n}`).join(' ')
  console.log(`    ${String(f.prevalence).padStart(5)}%  ${f.severity.padEnd(11)} ${f.code.padEnd(24)} (${f.stores} stores — ${split})`)
}
