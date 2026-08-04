# How to actually get cited: the action playbook

The audit tells you what is wrong. This tells you what to do about it, ordered by leverage rather than by how easy it is. Walk the user through it after the report, and only recommend the steps that match what the audit and the layer 2 search actually found.

**Everything here uses the user's own accounts.** No credentials of ours, no API keys of ours, no server of ours. Where a step needs an account, it is theirs. Never ask the user for a secret, and never put one in a command.

---

## 1. Get into Bing's index. This is the highest-leverage AEO action in 2026.

The reason is specific and worth stating to the user: **ChatGPT search and Microsoft Copilot both retrieve from Bing's index.** The same index you optimise for Bing is the one those two assistants read. Google's index is separate and governs AI Overviews and Gemini. So "being in Bing" is not a minor search engine, it is the gateway to two of the largest AI answer surfaces there are, and it is far less competitive than Google.

Guide the user through, in their own Bing Webmaster Tools account:

1. **Verify the site** in Bing Webmaster Tools. If they already use Google Search Console, Bing can import the verification, which is the fastest route.
2. **Submit the sitemap** there. This is the same `sitemap.xml` the audit checked for; if the audit reported `no_sitemap`, that gets fixed first.
3. **Set up IndexNow** for instant recrawl. IndexNow lets a site tell Bing (and Yandex, Seznam, Naver, Yep) the moment a page changes, instead of waiting to be crawled. Google does not support it, so this is a Bing-and-friends lever specifically. The mechanics: the user generates a key, hosts it as a text file at the site root, and pings the IndexNow endpoint whenever a page is published or updated. Many CMSs and CDNs have a one-click IndexNow integration, which is the route to prefer over hand-rolling it.

Tell the user plainly: this does not guarantee a citation, it makes the content *eligible and fresh* in the index the assistants read. Eligibility is the precondition, not the outcome.

## 2. Unblock the retrieval crawlers

If the audit reported `ai_search_crawler_blocked`, nothing above matters until it is fixed, because an assistant cannot cite a page it is not allowed to fetch. See `fixes.md` under that code. Remind the user that blocking training crawlers (`GPTBot`, `CCBot`, `anthropic-ai`) is a separate, legitimate choice and does not need reversing to gain AI visibility.

There is also a third category worth naming: the user-triggered agents (`ChatGPT-User`, `Perplexity-User`, `Claude-User`) that fetch a page live when someone pastes a link or an agent browses on demand. Blocking those blocks the highest-intent visits of all. If the site blocks everything with a blanket rule, this is part of what it is losing.

## 3. Make each important page machine-readable

For every page that should be citable, in priority order:

1. **Server-render the main content** so it exists without JavaScript (fixes `content_js_only`).
2. **Add the right structured data.** `Article` or `BlogPosting` for content, `Product` for a product, `FAQPage` for a real FAQ, `Organization` and `WebSite` on the home page. This is what lets an assistant quote a fact instead of guessing it.
3. **Expose author and dates.** Named authorship and an honest `dateModified` are trust signals assistants use to decide whether to cite a source.

## 4. Give answers a shape an engine can lift

Answer engines quote a sentence, not a page. The content that gets cited states the question and then answers it directly:

- Phrase some headings as the question a reader would actually ask.
- Put the direct answer in the first sentence beneath the heading, then elaborate.
- Add a real FAQ with `FAQPage` schema where the page genuinely answers recurring questions. Do not fabricate one: a padded FAQ reads as filler to a human and to a model.

## 5. Publish an llms.txt

Cheap, not a cure. A plain-text file at `/llms.txt` that says what the site is about, who it is for, and which pages matter gives an assistant the context it otherwise has to infer. Present it as upside, never as a defect that must be fixed.

## 6. Earn off-site presence where the answers come from

This is where the layer 2 search does its real work. If the audit's questions were answered mostly by **listicles, review sites and forums**, then the site is not cited because it is absent from those sources, and no amount of on-page schema changes that. The project there is getting into the specific listicles and review sites that surfaced, and being discussed on the forums that did. If instead assistants quoted **source sites directly**, then the on-page work above is what moves the needle. The source-type column in the question set is what tells these two projects apart, so read it before recommending either.
