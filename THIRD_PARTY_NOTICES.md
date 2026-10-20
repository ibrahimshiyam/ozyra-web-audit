# Third-party notices

Version 0.2 installs pinned packages from npm; it does not vendor their source or redistribute Chrome binaries. Preserve each installed package's licenses/notices. Exact transitive versions, integrity values and source registry URLs are in package-lock.json; declared licenses for all 117 resolved packages are recorded in docs/dependency-licenses.json. No unknown license declarations were found in that inventory.

Direct dependencies:

| Package | Version | Declared license | Upstream |
|---|---|---|---|
| playwright-core | 1.64.1 | Apache-2.0 | https://github.com/microsoft/playwright |
| @axe-core/playwright | 4.14.0 | MPL-2.0 | https://github.com/dequelabs/axe-core-npm |
| lighthouse | 13.5.0 | Apache-2.0 | https://github.com/GoogleChrome/lighthouse |
| puppeteer-core | 25.15.0 | Apache-2.0 | https://github.com/puppeteer/puppeteer |
| ipaddr.js | 2.5.0 | MIT | https://github.com/whitequark/ipaddr.js |
| robots-parser | 3.0.1 | MIT | https://github.com/samclarke/robots-parser |

The axe-core dependency is MPL-2.0 with additional bundled-component notices. Its source is unmodified and installed through npm; users can obtain corresponding package source through the pinned registry source and upstream repository. Any future modified or bundled distribution must preserve notices and satisfy its file-level source obligations. Inspect installed axe-core/LICENSE and package contents before redistribution.

Transitive license expressions include MIT, Apache-2.0, MPL-2.0, BSD-2-Clause, BSD-3-Clause, ISC, 0BSD and (MIT OR CC0-1.0). This inventory is a provenance aid, not a substitute for reviewing a changed distribution. Node.js and Chrome are installed separately and are not redistributed here. Documentation links do not imply affiliation or endorsement.

Runner additions: the derived Microsoft Playwright seccomp profile is distributed under Apache-2.0 with its full license and modification provenance in runner/. The official testing container image is digest pinned and consumed on ephemeral CI; its browser binaries are not redistributed in this repository.
