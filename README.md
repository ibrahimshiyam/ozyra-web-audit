# Ozyra Web Audit

**Isolated public-page capture through a bounded Unix-socket broker, with zero LLM calls.**

A deterministic website-review prototype using Playwright, axe-core and Lighthouse. Version 0.3 captures operator-approved public pages from a disconnected browser container. It also serves owned test pages for reproducible regression checks. Both modes produce screenshots, browser accessibility checks, Lighthouse diagnostics and evidence-linked HTML/JSON. It is not an unrestricted scanner, accessibility certification service, security assessment or sales agent.

## Audit approved public pages (verified Linux Docker runner)

Use a Linux host with an already installed/running Docker runtime and Node.js 22.19+. The existing hosted Ubuntu 24.04 CI runner is verified. No daemon is started or host networking changed by these commands. Docker Desktop on macOS is not supported by this Unix-socket host/container transport.

```sh
npm ci --ignore-scripts --no-fund
docker build -f runner/Dockerfile -t ozyra-isolation-proof .
node src/cli.js audit --manifest /private/approved-pages.json --out /private/audit-output
```

The operator-supplied manifest is small and explicit:

```json
{"version":1,"pages":["https://example.com/"]}
```

At most three same-origin pages; no credentials, URL queries, private addresses or nonstandard ports. Put real manifests and reports outside Git. `--fresh` recaptures; otherwise matching image/source/manifest inputs reuse checksum-verified artifacts with their original timestamps. The first run never requires an LLM. A fresh run checks robots and public DNS before approved page requests.

The host broker owns policy and budgets. The non-root Chromium/controller container has network-none, zero outer capabilities, no-new-privileges, a read-only root filesystem and its own sandbox. It can ask for resources only through the temporary Unix socket. Only selected pages and static same-origin resources discovered in delivered HTML/CSS are accepted. Unlisted/dynamic API paths, cross-origin assets, mutations, credentials, cookies, websockets and off-scope redirects are refused. Blocked resources can make a capture partial; they are not automatically defects in the site.

Outputs: actual PNGs, axe results, selected headers, brokered Lighthouse diagnostics, JSON, HTML and checksum manifest. There is no crawling, contact, form submission, publishing or model integration. No reports are uploaded by the tool.

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

Performance is measured through a request broker with provided (unthrottled) conditions. One run is provisional and cannot represent public-site latency or field experience. TBT is not INP. Automated accessibility results are not WCAG conformance. No holistic quality/security score or sales outcome is asserted.

## Request boundaries

The browser has an ephemeral profile, sandbox, no downloads or service workers, and a deny-all fallback proxy. Approved requests are fulfilled by a Node broker that checks origin/method, validates all DNS answers, pins the connection IP, checks each new request, refuses out-of-scope redirects, and enforces time/request/byte limits. Only the internally created owned fixture receives a narrow loopback exception; callers cannot invent that capability. Credentials and cookies are not forwarded. Websockets and mutations are blocked. Robots disallow, 403/429 and recognized challenge/login responses stop or block capture honestly.

The network-none container proof passes on hosted Ubuntu 22.04/24.04. The Unix-socket integration passes real external owned HTTP/HTTPS capture, DNS-rebinding rejection and TLS-hostname verification tests. CAPTCHA/login detection remains heuristic. The direct URL shortcut remains disabled; only the manifest-based isolated command above is supported:

```sh
node src/cli.js audit https://example.com
# DIRECT_LIVE_DISABLED, before any target access
```

See [verified boundary and limitations](docs/live-capture-gate.md). No user-selectable private-target bypass exists.

## Lightweight offline mode

The original dependency-free synthetic analyzer remains available, without browser/model calls:

```sh
node src/cli.js demo --out /tmp/ozyra-synthetic-demo
node src/cli.js analyze --input fixtures/demo.json --out /tmp/ozyra-synthetic-demo
```

Its schemaVersion 1 output is labelled synthetic supplied observations. The real collector uses schemaVersion 2 and a measurement kind identifying controlled or public capture. Do not confuse the two. `examples/synthetic/` is the old offline sample, not a screenshot.

## Private outputs and public code

Output paths inside this repository, including symlink aliases, are rejected. Public examples must be explicitly reviewed owned/synthetic content. Real prospect dossiers, screenshots, contacts and raw responses must remain outside Git; ignore rules alone do not sanitize data. This release has no LLM adapter, credentials, outreach, CRM or commercial commitments.

[Methodology/funnel](docs/methodology.md) · [provenance](docs/provenance.md) · [dependency notices](THIRD_PARTY_NOTICES.md) · [license inventory](docs/dependency-licenses.json).

[Verified runner architecture](docs/isolated-runner.md) · [Release verification evidence](docs/verification.md).
