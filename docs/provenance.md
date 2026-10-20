# Provenance and publication review

This project was authored independently for Ozyra Labs. Existing Ozyra projects were inspected to avoid duplicating their CRM, proposal, platform and social-workflow scope. No source, screenshots, templates, databases, credentials or Git history were copied from those projects.

Version 0.1's committed example uses reserved example.invalid URLs and authored observation JSON. Version 0.2's controlled fixture is newly authored HTML served by the tool itself; actual screenshots and measurements contain no real institution or patient data. Generated captures remain outside the repository. The CLI has no public-target activation flag.

Project source license: MIT. JavaScript ES modules avoid a compiler/build step; the evidence interfaces are explicit JSON schemas by version. Third-party packages are pinned with integrity metadata, installed with lifecycle scripts disabled, and retain their own licenses. See THIRD_PARTY_NOTICES.md and docs/dependency-licenses.json.

Before publication: inspect tracked files and full history; scan secrets and private evidence; review dependencies/notices and exact archive; keep real evidence outside Git. The ignore file is a secondary guard, not a data-loss prevention guarantee. CI operates only on owned fixtures and uploads no capture artifacts. Commits use the GitHub no-reply author address.
