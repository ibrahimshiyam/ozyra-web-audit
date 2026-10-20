# Gate before live capture

Status: **not passed; collector not implemented; all live targets disabled**.

The offline tests prove that this release refuses every live target. They do not prove that a future browser's network stack prevents SSRF, rebinding or mutations.

Use proven Playwright/Chromium, axe-core and Lighthouse integrations before inventing browser or accessibility engines. Pin versions and review licenses before installation/distribution. Do not enable a collector by removing the current refusal alone.

Required before activation:

1. An explicit manifest of <=3 approved public same-origin pages, no automatic link expansion. Prevent credentials in URLs and non-HTTP(S) schemes.
2. Enforce public IP address policy for every DNS resolution, connection, redirect and subresource, including IPv6, mapped addresses, metadata/link-local targets, rebinding and service workers. Prefer an independently tested restrictive egress proxy or equivalent connection-level enforcement; hostname parsing alone is insufficient.
3. Sandboxed ephemeral browser with no login profile, credentials, downloads or local filesystem privileges. Restrict non-GET/HEAD requests and disclose rendering effects. No booking submissions or third-party booking interactions.
4. Respect robots/site restrictions, identifying user agent and contact. Robots guidance is not access authorization. Stop on login, CAPTCHA, 403, 429 or complaint; honor Retry-After without circumventing restrictions.
5. One active page per origin, >=5 seconds between top-level navigations, 45 seconds/page and 8 minutes/site. Add enforced request and byte caps before release; count subresources. Return partial/blocked coverage when budgets expire.
6. Pin viewports 390x844, 320x800, 1440x900; record locale/timezone/region, browser/rules versions, consent/loading/font uncertainty and timestamps. Screenshot capture must actually occur before any artifact is called a screenshot.
7. For shortlisted performance findings, three sequential isolated lab runs with raw metrics, median and range. Do not infer INP from TBT or Maldives field experience from origin-wide CrUX.
8. Synthetic browser fixtures prove expected findings AND non-findings: alt/label failures, overflow, obstructed CTA, slow resource, mixed content, header equivalence, infinite loading, access denial and redirects. Include mutation interception and connection-level private-network tests. Never assert exact live performance scores.
9. Human review of at least ten synthetic/owned cases before prospect use. Confirm scope and fresh evidence before any external claim.

No heavy local builds, remote deployments or browser downloads were needed for version 0.1.0. A future browser installation and runner choice are separate implementation prerequisites.
