// Rebuilds the prevalence benchmark from the 2026-07-29 full-catalogue audit.
// Severity belongs to the instance, not to the code: a store is counted once per
// code, at the severity it was actually rated at on that store. When a store hits
// the same code at several severities, the worst one it got is the one recorded.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.argv[2] || 'full'
const RANK = { CRITICAL: 3, WARNING: 2, OPPORTUNITY: 1, INFO: 0 }

const files = []
;(function walk (dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (entry.name === 'results.json') files.push(p)
  }
})(ROOT)

const seen = new Set()          // every store hostname encountered
let complete = 0                // stores whose scan actually finished
let incomplete = 0
let productPages = 0

// code -> store -> worst severity that store got for this code
const byCode = new Map()
const storesCritical = new Set()
const storesCriticalOrWarning = new Set()
const storesWithAnyFinding = new Set()

for (const file of files) {
  let batch
  try { batch = JSON.parse(fs.readFileSync(file, 'utf8')) } catch { continue }
  for (const store of batch) {
    if (!store.store) continue
    const host = new URL(store.store).hostname.replace(/^www\./, '')
    if (seen.has(host)) continue          // one store, one scan
    seen.add(host)
    if (store.status !== 'ok' || !Array.isArray(store.pdps)) { incomplete++; continue }
    complete++
    for (const pdp of store.pdps) {
      productPages++
      for (const issue of pdp.issues || []) {
        if (!issue.code || !issue.severity) continue
        storesWithAnyFinding.add(host)
        if (issue.severity === 'CRITICAL') storesCritical.add(host)
        if (issue.severity === 'CRITICAL' || issue.severity === 'WARNING') storesCriticalOrWarning.add(host)
        if (!byCode.has(issue.code)) byCode.set(issue.code, new Map())
        const stores = byCode.get(issue.code)
        const prev = stores.get(host)
        if (prev === undefined || RANK[issue.severity] > RANK[prev]) stores.set(host, issue.severity)
      }
    }
  }
}

const findings = [...byCode.entries()].map(([code, stores]) => {
  const breakdown = {}
  for (const severity of stores.values()) breakdown[severity] = (breakdown[severity] || 0) + 1
  // The severity we publish is the one that dominates in store count, not the
  // worst one ever seen. Ties break towards the worse severity.
  const dominant = Object.entries(breakdown).sort(
    (a, b) => b[1] - a[1] || RANK[b[0]] - RANK[a[0]]
  )[0][0]
  return {
    code,
    severity: dominant,
    severity_breakdown: breakdown,
    stores: stores.size,
    prevalence: Number((stores.size / complete * 100).toFixed(1))
  }
}).sort((a, b) => b.stores - a.stores)

const benchmark = {
  $schema: './benchmark.schema.json',
  version: 2,
  generated_at: '2026-07-31',
  generated_from: 'StoreCanary full-catalogue scans of live Shopify storefronts, 2026-07-29',
  method: 'Every store is scanned from the outside, the way a crawler sees it: storefront HTML, JSON-LD, products.json, robots and meta directives. No app, no admin access, no cooperation from the store required. Version 2 inspects the whole catalogue rather than a three-page sample, which is what changed the numbers.',
  sample: {
    stores: complete,
    product_pages: productPages,
    stores_with_at_least_one_critical: storesCritical.size,
    stores_with_at_least_one_critical_or_warning: storesCriticalOrWarning.size,
    stores_with_at_least_one_finding: storesWithAnyFinding.size,
    share_with_critical: Number((storesCritical.size / complete * 100).toFixed(1)),
    share_with_critical_or_warning: Number((storesCriticalOrWarning.size / complete * 100).toFixed(1)),
    incomplete_scans_excluded: incomplete
  },
  caveats: [
    'Version 2 is not comparable with version 1. Version 1 sampled three product pages per store and therefore under-counted every defect that touches only part of a catalogue, which is most of them.',
    'The sample is drawn from Shopify storefronts discovered in English-speaking markets (US, GB, CA, AU). Rates on other platforms or in other markets are unknown.',
    'Stores are counted once each, on a single scan. A defect present on one page out of two thousand counts the store as affected, which is the right unit for "does this store have the problem" and the wrong one for "how much of this catalogue is broken".',
    'Severity belongs to the instance. The same code is rated differently depending on what was found, so read severity_breakdown before quoting a code as critical.'
  ],
  findings
}

process.stdout.write(JSON.stringify(benchmark, null, 2) + '\n')
process.stderr.write(`stores complete=${complete} incomplete=${incomplete} pdps=${productPages} codes=${findings.length}\n`)
