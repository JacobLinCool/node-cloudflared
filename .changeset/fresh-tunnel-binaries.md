---
"cloudflared": minor
---

Extend `install` with options for a minimum binary version and a configurable refresh interval. Refresh CLI-managed binaries every 30 days by default, preserve explicit version pins, and keep working binaries when an optional refresh fails.
