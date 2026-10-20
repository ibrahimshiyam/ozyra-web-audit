# Ozyra Web Audit

**Real controlled-site browser capture, with zero LLM calls. Public-target execution remains disabled.**

A deterministic website-review prototype using Playwright, axe-core and Lighthouse. Version 0.2 actually serves owned test pages, captures screenshots, runs browser accessibility checks and Lighthouse measurements, and generates evidence-linked HTML/JSON. It is not an unrestricted scanner, accessibility certification service, security assessment or sales agent.

## Run the real controlled demonstration

Node.js **22.19+** and installed Google Chrome are required. macOS defaults to `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; elsewhere set `OZYRA_CHROME` to a supported installed Chrome executable. No compilation, API keys or database.

```sh
npm ci --ignore-scripts --no-fund
node src/cli.js controlled --out /tmp/ozyra-browser-evidence
```

The command starts its own loopback fixture server, closes it afterward, and prints a bundle directory. Open `report.html` there. The bundle contains actual viewport/full-page PNGs at 390×844, 320×800 and 1440×900, raw axe JSON, Lighthouse snapshot/navigation results, `capture.json`, and checksum manifest. No prospect is contacted.

Repeat the command to verify and reuse the cached bundle without starting a server or browser capture. Browser version, lockfile, collector and fixture sources contribute to cache identity. `--fresh` captures a new run. Cached evidence retains its original timestamp; it is not proof of current website state.

```sh
node scripts/verify-controlled.js /path/to/printed/bundle
node --test test/audit.test.js test/network.test.js
OZYRA_BROWSER_TESTS=1 node --test --test-concurrency=1 test/browser.test.js
```

Browser tests run serially with the Chromium sandbox enabled. If the execution environment cannot launch a sandboxed browser, report the failure; do not add `--no-sandbox` or disable security settings. CI uses its installed Chrome on macOS. No browser binaries are redistributed.

## What the actual collector measures

- Document/viewport width and horizontal overflow; contact-link presence, not successful contact.
- Actual axe violations, incomplete, passed and inapplicable rules, with targets and raw evidence.
- Screenshots plus browser, tool, viewport, locale, timezone and capture timestamp.
- Lighthouse accessibility snapshot and a single performance navigation run with LCP, CLS, TBT, FCP and bytes. Snapshot and navigation each record their own URL and viewport.
- Only selected response headers; no cookie values or credentials are saved.

The intentionally defective owned page has missing image alt text, an unlabelled input and mobile overflow. The clean fixture provides a non-failure comparison. These are **real measurements of synthetic content**, not invented observation JSON or prospect findings.

Performance is measured through a request broker on a local fixture with provided (unthrottled) conditions. One run is provisional and cannot represent public-site latency or field experience. TBT is not INP. Automated accessibility results are not WCAG conformance. No holistic quality/security score or sales outcome is asserted.

## Request boundaries

The browser has an ephemeral profile, sandbox, no downloads or service workers, and a deny-all fallback proxy. Approved requests are fulfilled by a Node broker that checks origin/method, validates all DNS answers, pins the connection IP, checks each new request, refuses out-of-scope redirects, and enforces time/request/byte limits. Only the internally created owned fixture receives a narrow loopback exception; callers cannot invent that capability. Credentials and cookies are not forwarded. Websockets and mutations are blocked. Robots disallow, 403/429 and recognized challenge/login responses stop or block capture honestly.

These application controls are tested; they are **not an independently verified OS-wide egress boundary**. CAPTCHA/login detection is heuristic. Public-target execution remains fail-closed while that production boundary and arbitrary-site behavior are unresolved:

```sh
node src/cli.js audit https://example.com
# LIVE_DISABLED, before any target access
```

See [remaining activation gate](docs/live-capture-gate.md). No user-selectable private-target bypass exists.

## Lightweight offline mode

The original dependency-free synthetic analyzer remains available, without browser/model calls:

```sh
node src/cli.js demo --out /tmp/ozyra-synthetic-demo
node src/cli.js analyze --input fixtures/demo.json --out /tmp/ozyra-synthetic-demo
```

Its schemaVersion 1 output is labelled synthetic supplied observations. The real collector uses schemaVersion 2 and `kind: controlled-browser-measurement`. Do not confuse the two. `examples/synthetic/` is the old offline sample, not a screenshot.

## Private outputs and public code

Output paths inside this repository, including symlink aliases, are rejected. Public examples must be explicitly reviewed owned/synthetic content. Real prospect dossiers, screenshots, contacts and raw responses must remain outside Git; ignore rules alone do not sanitize data. This release has no LLM adapter, credentials, outreach, CRM or commercial commitments.

[Methodology/funnel](docs/methodology.md) · [provenance](docs/provenance.md) · [dependency notices](THIRD_PARTY_NOTICES.md) · [license inventory](docs/dependency-licenses.json).
