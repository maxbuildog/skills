#!/usr/bin/env node
/**
 * Validates every skill in skills/ against the house rules from
 * docs/skill-authoring.md. Run before opening a pull request; CI runs it too.
 *
 * Deliberately dependency-free: the frontmatter subset used by SKILL.md is a
 * flat set of scalar keys, which does not justify pulling in a YAML parser.
 *
 * Usage: node scripts/validate-skills.mjs [--quiet]
 * Exit code 1 if any error is found. Warnings do not fail the build.
 */

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SKILLS_DIR = join(ROOT, 'skills')
const QUIET = process.argv.includes('--quiet')

const DESCRIPTION_MAX = 1024
const BODY_MAX_LINES = 500
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const errors = []
const warnings = []

const err = (skill, msg) => errors.push(`${skill}: ${msg}`)
const warn = (skill, msg) => warnings.push(`${skill}: ${msg}`)

/**
 * Parses the leading `---` fenced block as flat `key: value` pairs.
 * Returns { data, body, bodyStartLine } or null when no frontmatter is present.
 */
function parseFrontmatter (raw) {
  if (!raw.startsWith('---')) return null
  const lines = raw.split(/\r?\n/)
  const end = lines.indexOf('---', 1)
  if (end === -1) return null

  const data = {}
  let currentKey = null
  for (const line of lines.slice(1, end)) {
    const match = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (match) {
      currentKey = match[1]
      // Block scalars (`key: |` and `key: >`) carry their value on the
      // following indented lines, which is how a description long enough to
      // list trigger phrases stays readable.
      data[currentKey] = /^[|>][-+]?$/.test(match[2].trim()) ? '' : match[2].trim()
    } else if (currentKey && /^\s+\S/.test(line)) {
      data[currentKey] = `${data[currentKey]} ${line.trim()}`.trim()
    }
  }
  const unquote = (v) =>
    (v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))
      ? v.slice(1, -1)
      : v
  for (const key of Object.keys(data)) data[key] = unquote(data[key])

  return { data, body: lines.slice(end + 1).join('\n'), bodyStartLine: end + 1 }
}

/** Collects every relative markdown link target, ignoring http(s) and anchors. */
function relativeLinks (markdown) {
  const out = []
  const re = /\[[^\]]*\]\(([^)]+)\)/g
  let m
  while ((m = re.exec(markdown)) !== null) {
    const target = m[1].trim().split(' ')[0]
    if (/^(https?:|mailto:|#)/.test(target)) continue
    out.push(target.split('#')[0])
  }
  return out.filter(Boolean)
}

function validateSkill (name) {
  const dir = join(SKILLS_DIR, name)
  const skillFile = join(dir, 'SKILL.md')

  if (!existsSync(skillFile)) {
    err(name, 'no SKILL.md')
    return
  }

  const raw = readFileSync(skillFile, 'utf8')
  const parsed = parseFrontmatter(raw)
  if (!parsed) {
    err(name, 'SKILL.md has no YAML frontmatter delimited by ---')
    return
  }
  const { data, body } = parsed

  // --- required fields -----------------------------------------------------
  if (!data.name) err(name, 'frontmatter is missing `name`')
  else if (data.name !== name) err(name, `frontmatter name "${data.name}" does not match folder name "${name}"`)

  if (!NAME_RE.test(name)) err(name, 'folder name must be lowercase kebab-case')

  if (!data.description) {
    err(name, 'frontmatter is missing `description`')
  } else {
    if (data.description.length > DESCRIPTION_MAX) {
      err(name, `description is ${data.description.length} chars, max is ${DESCRIPTION_MAX}`)
    }
    // Anthropic's own skill-creator guidance says descriptions should lean
    // "pushy", because agents under-trigger skills. Quoted trigger phrases in
    // the user's own words are what both the agent and the registries match on.
    if (!/use when/i.test(data.description) && !/triggers?\s*:/i.test(data.description)) {
      warn(name, 'description has neither a "Use when ..." clause nor a "Triggers:" list, which is what the agent matches on')
    }
    if (!/"[^"]{4,}"/.test(data.description)) {
      warn(name, 'description quotes no trigger phrase in the user\'s own words')
    }
    if (/storecanary\.io/i.test(data.description)) {
      err(name, 'description must not contain a product link (see docs/skill-authoring.md, the link rule)')
    }
  }

  // --- body ----------------------------------------------------------------
  const bodyLines = body.split('\n').length
  if (bodyLines > BODY_MAX_LINES) {
    warn(name, `SKILL.md body is ${bodyLines} lines, over ${BODY_MAX_LINES}: move detail into references/`)
  }

  // --- the link rule -------------------------------------------------------
  const productLinks = [...body.matchAll(/storecanary\.io/gi)]
  if (productLinks.length > 1) {
    err(name, `${productLinks.length} references to storecanary.io, the limit is one, on the last line`)
  }
  if (productLinks.length === 1) {
    const idx = body.lastIndexOf('storecanary.io')
    const tail = body.slice(idx)
    if (tail.split('\n').filter((l) => l.trim()).length > 2) {
      warn(name, 'the product link should sit at the end of the report, not in the middle')
    }
    if (!body.includes('utm_source=github') || !body.includes(`utm_campaign=${name}`)) {
      err(name, `the product link must carry utm_source=github and utm_campaign=${name} so the channel is measurable`)
    }
  }

  // --- a skill that needs something must say so -----------------------------
  const scriptsDir = join(dir, 'scripts')
  if (existsSync(scriptsDir) && !data.compatibility) {
    warn(name, 'ships scripts but declares no `compatibility`: say which runtime, binaries or keys are needed')
  }
  if (existsSync(scriptsDir) && !data['allowed-tools']) {
    warn(name, 'ships scripts but declares no `allowed-tools`: scope them rather than leaving Bash open')
  }
  if (data['allowed-tools'] && /(^|\s)Bash(\s|$)/.test(data['allowed-tools'])) {
    warn(name, 'grants unscoped `Bash`: prefer Bash(<command> *) so the skill cannot run anything it likes')
  }

  // --- the no-callback rule ------------------------------------------------
  if (existsSync(scriptsDir)) {
    for (const file of readdirSync(scriptsDir)) {
      if (!/\.(mjs|js|ts|sh|py)$/.test(file)) continue
      const src = readFileSync(join(scriptsDir, file), 'utf8')
      // A script may *print* the product URL; it must never call it.
      const callback = /(fetch|axios|request|curl|urlopen)\s*\(?[^\n]{0,80}storecanary\.io/i.test(src)
      if (callback) err(name, `scripts/${file} appears to call storecanary.io at runtime (no-callback rule)`)
    }
  }

  // --- links resolve -------------------------------------------------------
  for (const link of relativeLinks(raw)) {
    const target = resolve(dir, link)
    if (!existsSync(target)) err(name, `broken relative link: ${link}`)
  }
}

// ---------------------------------------------------------------------------

if (!existsSync(SKILLS_DIR)) {
  console.error('no skills/ directory found')
  process.exit(1)
}

const skills = readdirSync(SKILLS_DIR)
  .filter((entry) => !entry.startsWith('.') && !entry.startsWith('_'))
  .filter((entry) => statSync(join(SKILLS_DIR, entry)).isDirectory())

for (const skill of skills) validateSkill(skill)

// The README table should list every skill that exists, and no skill that does not.
const readme = existsSync(join(ROOT, 'README.md')) ? readFileSync(join(ROOT, 'README.md'), 'utf8') : ''
for (const skill of skills) {
  if (!readme.includes(skill)) warn(skill, 'not listed in the README skills table')
}

if (!QUIET) {
  console.log(`checked ${skills.length} skill${skills.length === 1 ? '' : 's'} in ${relative(ROOT, SKILLS_DIR) || 'skills'}/`)
}
for (const w of warnings) console.warn(`  warning  ${w}`)
for (const e of errors) console.error(`  error    ${e}`)

if (errors.length > 0) {
  console.error(`\n${errors.length} error${errors.length === 1 ? '' : 's'}`)
  process.exit(1)
}
if (!QUIET) console.log(warnings.length ? `\nok, with ${warnings.length} warning(s)` : '\nok')
