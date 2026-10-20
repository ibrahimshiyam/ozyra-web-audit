# Public-target activation gate

Version 0.2: **controlled owned-site capture works; arbitrary public targets remain disabled**.

## Implemented and tested

- Playwright with Chromium sandbox explicitly enabled, ephemeral profile and minimal environment; service workers/downloads disabled.
- Deny-all browser fallback proxy, including loopback bypass suppression, with browser verification that an unhandled request cannot reach the fixture server.
- Broker origin/method checks, all-answer public-IP validation, pinned connection addresses, per-request resolution, bounded DNS, TLS verification and no automatic redirects.
- Reject metadata/private/reserved/mapped addresses and off-origin redirect/subresource requests. The only loopback capability comes from the internally owned server and is not a CLI switch.
- Robots restrictions, 403/429 and recognized login/CAPTCHA bodies; mutations/websockets refused. Detection patterns are heuristic, not exhaustive.
- Request, per-response, aggregate byte and time budgets. Site stops on access challenges or exhausted budgets; incomplete captures never claim success.
- Real screenshots, axe findings and Lighthouse snapshot/navigation artifacts on controlled pages.

## Still required before enabling public targets

1. A validated OS/container-level egress boundary for the browser. The deny proxy, Chromium switches and interception are defense in depth, not an independently verified complete boundary for all browser channels/processes. This prototype does not configure a firewall, disable security controls or claim total network confinement.
2. Approved same-origin URL manifest and real-site robots/terms workflow, with explicit redirect rules and conservative subresource handling. No indiscriminate crawl or public private-address override.
3. Additional browser/worker/protocol cases and controlled DNS-to-connect integration tests in that runner. Current DNS pinning/rebinding tests use a mocked transport; browser tests exercise real HTTP on the owned loopback server, not public HTTPS rebinding.
4. Measurement calibration for brokered transfer timing, optional cold-browser repeated Lighthouse runs, and manual review of real rendering effects. Broker fulfillment changes network timing; do not present it as normal visitor performance.
5. Manual keyboard/focus, reflow, content and task checks. The tool cannot certify WCAG conformance or usability.
6. Retention/access policy for real dossiers and a reviewed recipient/send process before any outreach. No prospect outreach functionality exists.

Defaults: at most three pages, 390x844/320x800/1440x900, one page at a time, five-second navigation delay, 45-second request timeout, eight-minute overall browser deadline, 120 broker requests, 8 MiB per response and 32 MiB aggregate. Tests use shorter limits only against owned fixtures. Page subresources count toward limits.

Smallest next step: choose an approved isolated runner with enforceable egress restrictions, validate its network boundary using controlled HTTP/HTTPS/DNS cases, then enable a single operator-approved public own-site smoke. No public service or VPS configuration was changed in this release.
