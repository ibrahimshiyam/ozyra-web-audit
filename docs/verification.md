# Version 0.3 verification — 20 October 2026

Tested runtime commit: `57f5259ee021a2cb47bde3817e1efbb8a69e992f`. Subsequent documentation-only commits do not change that runtime.

## Passing checks

- [Audit regressions](https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39497982825): unit tests, sandboxed controlled browser checks and real controlled report/cache verification.
- [Isolated broker integration](https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39497982918): owned HTTP/HTTPS capture, mutation/private resource/redirect/robots/budget rejection, controlled DNS rebinding and TLS hostname verification. Full owned HTTPS capture produced six viewport screenshots and actual Lighthouse results.
- [Public demonstration smoke](https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39498025347): repeated all 30 unit/socket tests and 13 controlled integration cases before accessing the single fixed `https://example.com/` page. It completed at 21:11 UTC.

The public smoke captured actual screenshots at widths 390, 320 and 1440, ran axe (zero violation rules at each width) and completed Lighthouse diagnostics. Zero automated violations is not accessibility conformance. It recorded 11 broker requests, 13,277 response bytes, no broker rejection events, zero model calls and successful checksum-verified cache replay without recapture. Capture status was complete within its limited scope.

Isolation assertions passed during the public capture: non-root UID 1001, loopback-only interface, zero effective capabilities, no-new-privileges, direct IPv4/IPv6 TCP and UDP/DNS unreachable. Chromium sandboxing remained enabled. Screenshot PNG signatures and report artifacts were verified before private temporary outputs were deleted. No screenshots, raw reports or prospect data were uploaded. No forms were submitted.

Evidence manifest key: `be0dc2170e72ace34c1e5c580602bbbfa9f4ef89882197e35fa69bf505e5d119`. This identifies the ephemeral capture inputs; it is not an independently downloadable evidence archive.

The demonstration domain is maintained for examples by [IANA](https://www.iana.org/help/example-domains), not a production test dependency. This one bounded smoke does not establish coverage of arbitrary sites. It is manually dispatched, not scheduled.

## Usability and limits

Real public auditing is usable through the explicit manifest command on the verified Linux Docker runner. Direct unrestricted browser access stays disabled. Same-origin static resource discovery can exclude dynamic or third-party resources; such runs must disclose partial coverage instead of blaming the website. Brokered Lighthouse timings are diagnostics, not canonical visitor performance or field measurements. Manual accessibility and task-completion review remain required. See [boundary limits](live-capture-gate.md).

No VPS resources, local heavy build, host security changes, outreach or prospect audits were used. Runtime dependency advisory check reported zero known advisories on this date; this is a point-in-time registry check, not security assurance.
