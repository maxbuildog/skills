# The benchmark dataset

`benchmark.json` holds how common each defect is across a large sample of real, live e-commerce storefronts. Skills read it so that a finding arrives with context instead of on its own.

It ships in the repo on purpose. Skills never fetch it at runtime, so they keep working with no network, no key, and no server of ours in the path.

## How it was collected

Every store was scanned **from the outside**, the way Googlebot sees it: storefront HTML, JSON-LD, `products.json`, `robots.txt`, meta directives, `hreflang`, and the TLS certificate. No app installed, no admin access, no cooperation from the store required, nothing that a competitor could not also observe.

A store is counted **once**, on its most recent completed scan. Scans that did not complete (unreachable, password-protected, rate-limited on our side) are excluded: a store we could not read tells us nothing about how common a defect is.

Prevalence is measured **per store, not per page**. A store counts once for a given code whether one product page is affected or four hundred.

## What it contains

```json
{
  "sample": {
    "stores": 1083,
    "product_pages": 9643,
    "stores_with_at_least_one_critical": 240,
    "share_with_critical": 22.2
  },
  "findings": [
    {
      "code": "no_product_schema",
      "severity": "WARNING",
      "severity_breakdown": { "CRITICAL": 26, "WARNING": 130 },
      "stores": 156,
      "prevalence": 14.4
    }
  ]
}
```

`code` is the stable identifier for a defect. `stores` is the raw count and `prevalence` the share of the sample, in percent.

**Severity belongs to the instance, not to the code.** The scanner rates the same code differently depending on what it found: `no_product_schema` is CRITICAL when no markup is detectable at all, and WARNING when the markup exists but is injected client-side. `noindex_pdp` is CRITICAL on a real product and WARNING on a gift or sample SKU, where hiding the page is usually deliberate.

So `severity` is the severity that **most affected stores actually got**, and `severity_breakdown` gives the split. Read the breakdown before quoting a code as critical. In the example above, 156 stores are missing server-side product markup, but only 26 of them have nothing detectable at all — quoting 14.4% as critical would overstate the severe case by a factor of six.

## What it is not

**Not a random sample.** These are independent DTC stores, weighted towards the US, reached through the same discovery process every time. That process has its own biases, and they are inherited here.

**Not a measure of severity.** A defect being common does not make it harmless, and a rare one is not automatically urgent. `no_product_schema` sits on 14.4% of stores and costs those stores their rich results; `meta_desc_too_long` sits on 73.9% and costs almost nothing.

**Not stable across versions.** The scanner gains checks over time. A code that appears in version 2 and not version 1 was not absent from the web, it was unmeasured. Compare prevalences within one version only.

## Regenerating it

```bash
node scripts/build-benchmark.mjs /path/to/scan-results
```

The script walks the directories it is given, reads every `results.json` it finds, de-duplicates by hostname, and rewrites `benchmark.json`. Store names never leave the raw results: only aggregate counts are written.

## Contributing data

If you audit a set of stores and want to fold the results in, open an issue with the aggregate only, in the shape above. Please do not send raw scan output containing store URLs.
