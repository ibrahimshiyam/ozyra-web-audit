# Verified public-capture boundary and limits

Version 0.3 exposes only manifest-based isolated auditing. The raw/direct browser URL path is still disabled.

## Passed before activation

- Network-none browser/controller containers on hosted Ubuntu 22.04/24.04: non-root, zero effective capabilities, no-new-privileges, unreachable external IPv4/IPv6 TCP and UDP/DNS, and successful sandboxed browser/axe/Lighthouse capture. Evidence: https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39495555062 .
- Actual Unix-socket bridge to owned HTTP and HTTPS servers outside the browser namespace. Full HTTPS capture includes six screenshots and actual Lighthouse output.
- Server-enforced resource discovery, mutation and private-resource rejection, off-origin redirects, robots restrictions, request/byte/time caps, actual controlled UDP DNS rebinding, and TLS hostname mismatch rejection. Evidence: https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39497345296 .
- The broker owns budgets/policy; callers cannot supply overrides. Only internally owned fixtures get a narrow private address capability. TLS is never disabled. The socket permits fetch/manifest/stats, not CONNECT, arbitrary sockets, files or commands.

- The bounded public demonstration and cache replay passed on the same runtime after re-running all controlled integration checks. See [exact verification evidence](verification.md).

## Public run contract

Operator supplies 1–3 public same-origin HTTP(S) URLs, standard ports, without credentials/queries. No recursive discovery. The broker honors robots, sends an identifying user agent, validates every DNS answer and pins a validated connection address. It serializes requests, enforces >=5 seconds between selected-page loads, and never follows a redirect internally. Redirect scope is checked before returning a response.

Browser/controller are isolated from IP networking; the only external-resource route is the temporary Unix socket. Browser sandbox is enabled, service workers/downloads are disabled, and only bounded output and socket directories are mounted. Runtime parameters are fixed in src/isolated-runner.js. No host security setting, Docker socket, host network, SYS_ADMIN, persistent credential or remote service is used.

Defaults: 120 broker requests, 8 MiB per response, 32 MiB aggregate, 45 seconds/request, eight-minute capture deadline, 500 protocol calls and 500 discovered resource URLs. The operator command adds a ten-minute container-process deadline. Budget exhaustion returns blocked/partial evidence. Production callers cannot raise limits through the socket.

## Practical limitations

- Conservative static discovery supports same-origin src/link references and CSS URLs/imports. Dynamic API calls, srcset-only resources, module-generated requests and cross-origin CDN assets can be blocked. The report exposes partial coverage. Do not label policy-induced missing resources as website defects.
- Only identity transfer encoding is accepted; unexpected compressed responses are explicitly refused. Cookies/authentication are not forwarded or persisted.
- CAPTCHA/login detection is heuristic. Access denial/429/challenge responses stop the site; no evasion/retry campaign.
- Broker fulfillment changes browser network timing. Lighthouse numbers are brokered diagnostics, not canonical visitor-performance scores, field data or Maldives-specific measurements. Use an approved representative performance environment before making client-facing speed claims.
- Manual keyboard/focus, reflow, useful alt text, task completion and accessibility conformance remain outside automation. No security assurance/grade or sales outcome is asserted.
- This is a verified constrained implementation, not a claim of immunity to browser/kernel vulnerabilities. Recheck the boundary after changing runtime/image/profile/dependencies.
- Linux Docker is supported. macOS Docker Desktop's host Unix-socket transport is not supported by this launcher. No local daemon is auto-started.
- Real prospect evidence stays private. Public CI demonstrates owned fixtures; the separately dispatched public smoke is fixed to a documentation domain and uploads no captures.
