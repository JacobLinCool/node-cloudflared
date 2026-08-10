---
"cloudflared": patch
---

Update the toolchain and CI. Publishing now uses npm trusted publishing (OIDC) instead of a long-lived `NPM_TOKEN`, which npm revoked along with all classic tokens. pnpm moves to 11 for its native OIDC support, so its settings move from `package.json` to `pnpm-workspace.yaml`. Also bumps eslint, vitest, prettier, typedoc and `@types/node`, drops the unused `changeset` package (an unrelated LevelDB utility, not the changesets CLI), moves typedoc to a config file so the `@platform` tag no longer warns, upgrades the GitHub Actions to Node 24 runtimes, and refreshes the cloudflared test matrix.
