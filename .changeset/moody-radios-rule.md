---
"cloudflared": patch
---

Make `bin` respect `process.env.CLOUDFLARED_BIN` before choosing the default path, and it can be changed later using `use`.
