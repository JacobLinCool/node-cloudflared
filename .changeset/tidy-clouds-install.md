---
"cloudflared": minor
---

Remove the postinstall build and binary download. The CLI still downloads a missing binary on first use.
Library consumers must explicitly install the binary or supply an existing executable before using tunnel or service APIs.
Offline deployments must download the binary during setup. Source checkouts without lib/ need an explicit build.
