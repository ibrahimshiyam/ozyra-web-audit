# Ozyra Web Audit

**Offline synthetic evidence prototype — live website capture is disabled.**

A small, deterministic-first starting point for an evidence-led website review workflow. It analyzes bounded synthetic observations, produces evidence-linked JSON and a static HTML report, and reuses verified cached artifacts. It makes **zero network requests and zero LLM calls**. It is not yet a website scanner, accessibility certification service, security assessment or sales agent.

## Run

Requires Node.js 22 or newer. No dependencies, installation, compilation, API keys, database or service are required.

```sh
node --test
node src/cli.js demo --out /tmp/ozyra-audit-demo
node src/cli.js analyze --input fixtures/demo.json --out /tmp/ozyra-audit-demo
```

Open `report.html` in the bundle directory printed by the command. Each bundle includes the supplied `source.json`, `report.json`, `report.html` and a checksum manifest. A second identical invocation validates and reuses the cache without recapturing anything. Output paths inside this repository are rejected, including symlink aliases. Directory permissions are private on supported systems.

`examples/synthetic/report.html` is a reviewed synthetic sample committed deliberately. The production CLI cannot write into the repository. Do not place real prospect data in fixtures or examples. Validation does not establish that arbitrary supplied text is free of personal information.

```sh
node src/cli.js audit https://example.com
# exits unsuccessfully with LIVE_DISABLED before any network activity
```

## Implemented

- Explicit synthetic schema, at most three same-origin `.invalid` pages, input size and viewport limits.
- Horizontal-overflow checks from supplied dimensions; imported synthetic axe-style rule observations (axe itself is not run).
- Context-aware framing-header observation: CSP `frame-ancestors` can replace X-Frame-Options.
- Stable finding IDs, cross-page deduplication, source JSON pointers and checksums.
- Explicit blocked/not-tested/unknown coverage. No composite or security score.
- HTML escaping, restrictive report CSP, no remote scripts/assets, no form or sending capability.
- Immutable output bundles, input/version-keyed cache and artifact-integrity validation.
- Zero-model basic reports and explicit zero token/call accounting.

## Not implemented

Live browser capture, screenshots, axe execution, Lighthouse performance execution/ingestion, DNS and subresource egress enforcement, robots parsing, manual-review persistence, proposal-system integration and optional LLM synthesis. Empty `labSamples` is reserved; non-empty values are rejected rather than presented as verified performance data. No LLM adapter or credentials are provisioned.

These omissions are deliberate release boundaries. A syntactic URL check is **not** a network safety mechanism. All live execution remains disabled until the complete collector controls pass independent acceptance checks. See [live capture gate](docs/live-capture-gate.md).

## Evidence and interpretation

Supplied synthetic observations are not findings about a real organization. Automated accessibility findings cannot establish WCAG conformance. A missing header does not demonstrate exploitability. Performance field data and visitor traffic are unknown. No claim is made that a fix will increase bookings, revenue or sales.

See [methodology and funnel](docs/methodology.md), [source provenance](docs/provenance.md) and [third-party notices](THIRD_PARTY_NOTICES.md). Intended use is private, human-reviewed evidence preparation; this repository contains no prospect list or outreach automation.
