# Fixes, by finding code

One entry per code the audit can emit. Every fix is written for Shopify, because that is what the skill audits. Quote the fix, do not paraphrase it into something vaguer.

Order matters. A perfect product schema on a page nobody is allowed to fetch changes nothing.

---

## Crawler access

### `ai_search_crawler_blocked` — CRITICAL

**What it means.** `robots.txt` disallows one or more of the crawlers that fetch pages *at answer time*: `OAI-SearchBot` (ChatGPT search), `PerplexityBot`, `Claude-SearchBot`, `Applebot-Extended`, `meta-externalagent`. An assistant cannot cite a page it is not allowed to fetch.

**Why it happens.** Usually copied from a blog post about "blocking AI scrapers", written when the only concern was training data. The block also removed the store from the answers that send traffic.

**The fix.** Shopify serves a default `robots.txt` and it does not block these. If they are blocked, it came from `robots.txt.liquid` in the theme: Online Store, Themes, Edit code, `templates/robots.txt.liquid`. Remove the `Disallow` entries for the retrieval crawlers, or delete the file entirely to fall back to Shopify's default.

**Say this out loud to the merchant:** blocking retrieval crawlers and blocking training crawlers are different decisions with different consequences. They may well want the second and not the first.

### `google_extended_blocked` — WARNING

**What it means.** The store is opted out of `Google-Extended`, which governs AI Overviews and Gemini grounding. Ordinary Google Search ranking is untouched, so this is invisible in Search Console while removing the store from the largest AI answer surface there is.

**The fix.** Same file. Remove the `Google-Extended` disallow. If the merchant opted out deliberately, leave it and note the trade-off rather than overriding their decision.

### `ai_training_crawler_blocked` — INFO

**What it means.** `GPTBot`, `CCBot` or `anthropic-ai` are blocked. These collect data for training future models. They do not fetch pages to answer today's questions.

**The fix.** None needed. This is reported only so it does not get confused with `ai_search_crawler_blocked`. Blocking training crawlers is a legitimate choice and it costs nothing in AI visibility.

### `no_llms_txt` — OPPORTUNITY

**What it means.** No `/llms.txt`. It is a young convention and no assistant is known to require it.

**The fix.** Cheap, so worth doing, but do not sell it as a cure. Add a page or an asset served at `/llms.txt`: what the store sells, who it is for, the two or three things it does differently, the shipping and returns policy in one line each, and links to the most important collection and product pages. Plain text, under a hundred lines. On Shopify the usual route is an asset plus a redirect, since the storefront does not serve arbitrary root paths.

---

## Whether there is anything to read

### `noindex_pdp` — CRITICAL

**What it means.** The page tells search engines not to index it. AI answers are retrieved from those indexes. Nothing else on the page matters until this is removed.

**Check before reporting it as a problem.** Add-on products are noindexed deliberately and correctly: shipping insurance, gift wrapping, gift cards, demo SKUs, bundles that duplicate a main product. Open the URL. If it is an add-on, say so and move on. If it is a product the store actually sells, this is the single most urgent finding in the report.

**The fix.** In `theme.liquid`, find the conditional that emits `<meta name="robots" content="noindex">` and check which templates it covers. It is often a leftover from a launch, a staging setup, or an app that added it for a subset of products and never removed it.

### `product_content_js_only` — CRITICAL

**What it means.** The product name is not in the HTML the server returns. It appears only after JavaScript runs. Crawlers that do not execute scripts see a page with nothing to quote.

**The fix.** Render the product title, price and description in Liquid, server side. This is usually caused by a headless front end, a page builder app, or a theme that hydrates the product section client side. It is a real engineering task, not a settings change, and it is worth being straight with the merchant about that.

**Verify before escalating.** Fetch the page with JavaScript disabled and look for the title yourself. This finding is high stakes and worth two minutes of confirmation.

### `price_not_in_server_html` — WARNING

**What it means.** The price is in neither the server HTML nor the structured data. Nothing on the page states what the product costs before JavaScript runs.

**Not always a defect.** Member pricing, quote-only products and currency switchers legitimately withhold a price. Check which it is before recommending anything.

**The fix.** If the price should be public, put it in the Product schema at minimum. That alone makes it machine-readable even when the visible price is rendered client side.

---

## Structured data

### `no_product_schema` — CRITICAL

**What it means.** No `Product` structured data. This is the machine-readable version of the page: name, price, availability, brand, reviews. Without it an assistant has to infer from prose, and it prefers a competitor that did not make it infer.

**The fix.** Most modern Shopify themes emit it. If it is missing, the theme is old or it was stripped. Add a JSON-LD block to the product template with at least `name`, `image`, `description`, `brand`, `sku`, and an `offers` object carrying `price`, `priceCurrency` and `availability`. Dawn-based themes have this in `snippets/` already, so check whether it is simply not being rendered before writing new code.

### `invalid_jsonld` — CRITICAL

**What it means.** A JSON-LD block cannot be parsed even after cleaning stray control characters. Everything inside it is invisible.

**Usually caused by** an unescaped quote or newline injected from a product description into a Liquid template. A single apostrophe in a product title is the classic cause.

**The fix.** Pass every interpolated value through the `json` Liquid filter, which escapes it correctly. Then validate the page with Google's Rich Results Test.

### `no_price` — CRITICAL

The `Product` schema carries no price. Price is the most requested attribute in shopping questions. Add `offers.price` and `offers.priceCurrency`.

### `no_availability` — WARNING

The schema declares no availability. An assistant that cannot tell whether an item is in stock tends to leave it out. Add `offers.availability` with `https://schema.org/InStock` or `OutOfStock`, driven by real inventory rather than hardcoded. A hardcoded `InStock` on a sold-out product is worse than nothing, and Merchant Center penalises it.

### `no_rating` — OPPORTUNITY

No rating or reviews in the schema. Assistants lean on ratings to rank options against each other, and a product with none is easy to skip.

**The fix.** Requires real reviews. Install a review app that emits `aggregateRating` in JSON-LD, then collect reviews. Never emit a rating without the reviews to back it: that is a Merchant Center violation and a fast way to lose rich results entirely.

### `no_brand_in_schema` — OPPORTUNITY

No `brand` on the Product. Brand is how an assistant connects a product to what it knows about the seller. Add `"brand": {"@type": "Brand", "name": "..."}`. One line of Liquid.

### `no_identifiers` — INFO

No GTIN, MPN or SKU. Identifiers let the same product be matched across sources, which is what allows an assistant to compare offers. Fill the barcode field in Shopify for products that have one. Own-brand products with no GTIN can use `mpn` or `sku`. Do not invent identifiers.

---

## Content

### `thin_product_description` — WARNING

**What it means.** The description is under 200 characters. Assistants answer questions like "which one is good for sensitive skin" by reading descriptions. A page that states no attributes cannot match any specific question.

**Check first.** Add-ons and gift cards have no description on purpose and it does not matter. This only counts on products the store actually sells.

**The fix.** Write what the product is for, who it suits, what it is made of, and what it is not for. That last one matters more than it looks: "not for oily skin" is what lets an assistant confidently recommend it to everyone else. Attributes beat adjectives, every time.

### `no_canonical` — WARNING

No canonical URL, so variant and filter URLs compete with each other and the authority that should make one page citable is split. Shopify emits a canonical by default; if it is missing, the theme removed it. Restore it in `theme.liquid`.

### `meta_desc_missing` — INFO

No meta description. It is often the snippet a retrieval system quotes when summarising the page. Set it per product in the Shopify admin under search engine listing, or template it in the theme with a sensible fallback.
