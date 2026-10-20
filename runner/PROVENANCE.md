# Runner provenance

The testing image is the official Microsoft Playwright v1.64.1 noble image, pinned to digest sha256:7852dc5a7d72f5fe458a597d690f6c42fbc8e9e26ddfa95f8e6ef552558d9bbf as resolved by the existing GitHub-hosted CI runner on 2026-10-20. It is used only for owned fixtures, not arbitrary public sites. No browser binaries are checked into this repository.

chromium-seccomp.json is the unmodified Playwright sandbox profile from https://github.com/microsoft/playwright/blob/cfe490d941f992655948eee8fd4fd94e1c4234bf/utils/docker/seccomp_profile.json (v1.64.1), Apache-2.0, Microsoft Corporation. The accompanying PLAYWRIGHT-LICENSE preserves the license. It keeps defaultAction SCMP_ACT_ERRNO and adds clone/setns/unshare permission for Chromium user namespaces, as documented at https://playwright.dev/docs/docker.

This profile is applied only to the disposable test container. No host sysctl, AppArmor, firewall, network configuration, security daemon or persistent credential is modified. No SYS_ADMIN or other Linux capability is granted. Chromium's sandbox remains enabled. The proof fails rather than using no-sandbox or privileged containers.
