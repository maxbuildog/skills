# Changelog

Notable changes to this repo. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Finding codes are public identifiers: they are retired, never repurposed. A retired code is listed here so anyone holding an old report can look it up.

## [Unreleased]

### Added
- **`shopify-geo-audit`**, the first skill. Measures whether an online store can be found and recommended by AI assistants, in two separated layers: deterministic checks on AI crawler access and structured data, then a probe of twelve real buyer questions through the agent's own search. Findings carry prevalence from the benchmark.
- Per-skill `assets/benchmark.json`, synced by the build script and checked by CI, so a skill installed on its own still has its benchmark.

- Repository scaffolding: authoring guide, skill template, contribution rules, validator, CI.
- `data/benchmark.json`: defect prevalence over 1,045 scanned storefronts and 9,529 product pages, with the method and its caveats documented in `data/README.md`.
- `scripts/build-benchmark.mjs` to regenerate the benchmark from raw scan output.
- `scripts/validate-skills.mjs` enforcing the house rules on every skill, including the one-link rule and the no-callback rule.
