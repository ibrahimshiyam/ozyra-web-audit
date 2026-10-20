# Methodology and private workflow

Version 0.2 implements real browser capture on internally owned fixtures, plus the original offline report core. Public-site activation and the business workflow below remain planned; no prospect research or outreach has been performed.

## Evidence contract

Separate objective observation, manual verification, business hypothesis and recommendation. Every finding carries a stable rule ID, page/device scope, source pointer, confidence and review state. Deduplicate repeated template findings while preserving affected-page counts. No holistic website or security score. Rank future human-confirmed issues as task blocker, repeated significant barrier, minor issue, or unvalidated hypothesis.

Axe violations require manual interpretation; also preserve incomplete/manual, passed and not-applicable results when adding the actual collector. Keyboard/focus, reflow, alt usefulness and reading order require human checks. Missing field data stays unknown. Header observations are context dependent: CSP frame-ancestors can replace XFO; absent CORS permission is not a defect; X-XSS-Protection is not a required modern safeguard. Never save cookie values.

## Token economy

Collection, deterministic checks, deduplication, cache lookup, priorities and basic reporting never require an LLM. No LLM integration is present in this version. A later optional adapter must be off by default, accept only <=5 reviewed findings and <=2 selected crops, enforce proposed 6k input/1k output text caps and a separately accounted image/cost cap before a call, and report actual usage. Cache summaries by evidence hash, model/configuration and prompt version. Use deterministic output on budget exhaustion; no recursive retry chain. Untrusted page content is data, never instructions.

Artifact reuse does not establish freshness. Refresh shortlisted evidence before outreach; proposed stale threshold seven days, shorter for volatile pages. Keep cold-browser performance runs separate from artifact caching. Proposed private retention: 30 days for unqualified prospect evidence, with explicit deletion policy and operator control.

## Maldives-first pilot

Manually verify a small cohort of clinics and public-facing institutions, their official domains, service geography and public business contact. Traffic is unknown without reliable data. Review appointment information, services, contact discovery and mobile accessibility; never submit appointments or collect patient information. Determine language/currency/contact expectations from site context, not assumptions about tourists or English.

Stages: discovered -> identity/scope verified -> audit captured -> human-confirmed issue -> qualified -> private brief -> outreach approved -> contacted -> discovery -> proposal -> agreement -> delivery -> acceptance/support.

Require a materially relevant reproducible issue, not simply a poor score. Prepare a private excerpt with exact URL/device/date, selected annotated evidence, a feasible fix and limits. Human approval is required before recipients/messages, commercial proposals and commitments. No automated outreach, fear claims, public naming/shaming or guaranteed clients. Review applicable marketing requirements before sending. Prefer a targeted repair when sufficient.

The separate private Ozyra Proposal Studio already models clients/opportunities/proposals; future integration should exchange approved brief data, not copy its private source or database into this project. No CRM ships here.

Track denominators: screened sites, confirmed material issues, approved contacts, replies, conversations, proposals and wins; also time/site, false positives, token costs and opt-outs. Do not claim performance scores caused revenue changes.

## Sources

- [Playwright screenshots](https://playwright.dev/docs/screenshots) and [visual comparison caveats](https://playwright.dev/docs/test-snapshots)
- [Lighthouse scoring and variability](https://developer.chrome.com/docs/lighthouse/performance/performance-scoring)
- [Web Vitals](https://web.dev/articles/vitals) and [CrUX methodology](https://developer.chrome.com/docs/crux/methodology/)
- [axe-core](https://github.com/dequelabs/axe-core), [W3C evaluation tools](https://www.w3.org/WAI/test-evaluate/tools/selecting/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Nielsen usability heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [OWASP HTTP headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
- [Robots exclusion protocol](https://www.rfc-editor.org/rfc/rfc9309.html)
