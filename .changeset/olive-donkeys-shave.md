---
"cloudflared": patch
---

Fix `CLOUDFLARED_VERSION` being ignored during installation. The `postinstall` script hardcoded `bin install latest`, so the environment variable documented in the README had no effect on the version that got installed. Installing an explicit version also printed `Installing cloudflared undefined` because the message read the raw argument instead of the resolved version.
