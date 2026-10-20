# Concrete isolated runner plan

## Existing options inspected, 2026-10-20

- Local macOS has Docker Desktop/client 29.3.1, context desktop-linux. Read-only daemon queries failed because the daemon is not running. It was not started. No runtime was installed and no local images were pulled.
- This public repository already permits GitHub Actions. Its self-hosted runner inventory is empty. Standard hosted macOS and Ubuntu runners are available; the existing macOS audit job already passes.
- The new proof uses existing hosted Ubuntu 22.04/24.04 Docker, not a VPS or a newly provisioned host. The official testing image is digest pinned in runner/Dockerfile.

## Verified result

Both Ubuntu 22.04 and 24.04 passed the complete isolation + sandboxed screenshot/axe/Lighthouse evidence proof: https://github.com/ibrahimshiyam/ozyra-web-audit/actions/runs/39495555062 . Tested runtime commit: 106c200. Jobs completed in 1m38s and 1m40s. The previous failures are preserved as evidence; the final configuration does not weaken host security or grant capabilities.

The runner choice is resolved: use the existing standard Ubuntu 24.04 hosted runner for the next controlled integration stage. No new runtime or host-security approval is needed for this proven configuration. Public target mode remains disabled until the bridge and controlled external HTTPS/DNS cases below pass.

## Selected minimum boundary

A non-root browser/controller container with `--network none`, all Linux capabilities dropped, no-new-privileges, read-only root filesystem, bounded tmpfs, no host network/IPC/Docker socket, and only an output directory mounted writable. Limits: 2 CPUs, 2 GiB memory, 256 processes, 512 MiB temporary storage and 256 MiB shared memory. Chromium's own sandbox stays enabled.

Docker's network-none driver gives the container only loopback. The proof asserts interfaces, non-root UID, zero effective capabilities, no-new-privileges, and immediate unreachable errors for public/private/metadata IPv4, public IPv6 and UDP/DNS. It then attempts actual screenshot/axe/Lighthouse capture on an owned fixture inside that namespace. Passing only the network assertions is NOT a passing browser-isolation end-to-end test.

The default container seccomp profile could not launch the sandbox. The version-pinned Playwright profile enabled namespace creation but its capability-conditioned chroot rule still blocked Chromium. The documented local adjustment allows that syscall while retaining zero outer capabilities and kernel permission checks. No host AppArmor/sysctl/firewall/security service is changed. Provenance/license are in runner/PROVENANCE.md.

## Minimal public-site architecture: next implementation

Network-none cannot fetch a public page on its own. Keep it that way:

1. Run a small trusted Node request broker outside the browser namespace. It receives a fixed operator-approved URL manifest, not browser-supplied policy. It holds no credentials and never executes fetched HTML/JS.
2. Expose only a temporary Unix-domain socket to the capture controller. No IP listener, CONNECT tunnel, arbitrary socket operation, shell endpoint or file API. The socket directory is isolated per run and removed at exit. A read-only socket mount does not itself constrain API operations; the broker must enforce its narrow protocol.
3. Move the current guarded fetch implementation behind that socket. Enforce origin/path scope, robots, GET/HEAD, DNS-all-answer validation, pinned connections/TLS hostname checks, each redirect, rate/time/request/byte limits and redaction on the broker side. The client cannot increase budgets or grant private-address exceptions.
4. Controller requests approved resources over the socket and fulfills Playwright routes. The Chromium process remains without external network access even if a browser API bypasses Playwright interception. Only the broker can contact an approved public site.
5. Prove the separation against owned HTTP/HTTPS fixtures outside the browser container: allowed render succeeds via broker, direct traffic remains unreachable, off-origin/private/rebinding/redirect/mutation attempts fail, and every timeout returns partial/blocked evidence. Then one explicitly approved own-site public smoke can be considered.

The Unix-socket bridge and controlled external HTTPS/DNS integration tests are still implementation work. This document does not enable public targets or assert that the production boundary is complete.

## Permissions, costs and dependencies

Current fixture proof: existing repository code/CI authorization only, `contents: read`, standard hosted runners, no secrets, no persistent access, no artifact upload and no runtime/public service deployment. GitHub documents standard hosted-runner compute as free for public repositories; larger/private runner and storage charges are not assumed free. No paid runner or package registry is provisioned.

Dependencies: official Playwright test image plus locked npm dependencies already reviewed. Image download and script-only npm installation happen on ephemeral hosted CI, not the user's Mac or VPS. User-controlled real prospect reports must not become public CI logs/artifacts; a private operator environment is a separate deployment decision after the implementation is verified.

Sources: https://docs.docker.com/engine/network/drivers/none/ ; https://playwright.dev/docs/docker ; https://docs.github.com/en/billing/concepts/product-billing/github-actions .
