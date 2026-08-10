# cloudflared

## 0.7.3

### Patch Changes

- [#40](https://github.com/JacobLinCool/node-cloudflared/pull/40) [`9844a3a`](https://github.com/JacobLinCool/node-cloudflared/commit/9844a3a574fca9e9f6175a3e33dc308c10505eb0) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Fix `CLOUDFLARED_VERSION` being ignored during installation. The `postinstall` script hardcoded `bin install latest`, so the environment variable documented in the README had no effect on the version that got installed. Installing an explicit version also printed `Installing cloudflared undefined` because the message read the raw argument instead of the resolved version.

- [#40](https://github.com/JacobLinCool/node-cloudflared/pull/40) [`9844a3a`](https://github.com/JacobLinCool/node-cloudflared/commit/9844a3a574fca9e9f6175a3e33dc308c10505eb0) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Update the toolchain and CI. Publishing now uses npm trusted publishing (OIDC) instead of a long-lived `NPM_TOKEN`, which npm revoked along with all classic tokens. pnpm moves to 11 for its native OIDC support, so its settings move from `package.json` to `pnpm-workspace.yaml`. Also bumps eslint, vitest, prettier, typedoc and `@types/node`, drops the unused `changeset` package (an unrelated LevelDB utility, not the changesets CLI), moves typedoc to a config file so the `@platform` tag no longer warns, upgrades the GitHub Actions to Node 24 runtimes, and refreshes the cloudflared test matrix.

## 0.7.2

### Patch Changes

- [`8239b69`](https://github.com/JacobLinCool/node-cloudflared/commit/8239b695605fd5be193c5db4a133a41feb93e530) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Update tooling and dev dependencies (pnpm 10, eslint 10, typescript 6, vitest 4, @types/node 25, etc.) and refresh cloudflared test matrix

## 0.7.1

### Patch Changes

- [#35](https://github.com/JacobLinCool/node-cloudflared/pull/35) [`779c35b`](https://github.com/JacobLinCool/node-cloudflared/commit/779c35b22f32addabb237537e02e94c82273db88) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Remove redundant error event listeners in Tunnel class

## 0.7.0

### Minor Changes

- [#32](https://github.com/JacobLinCool/node-cloudflared/pull/32) [`a095103`](https://github.com/JacobLinCool/node-cloudflared/commit/a0951031406b09a395e67ebb9dab8f3b79e6c9a2) Thanks [@koterpillar](https://github.com/koterpillar)! - Don't fail package installation if binary can't be run

## 0.6.0

### Minor Changes

- [#28](https://github.com/JacobLinCool/node-cloudflared/pull/28) [`52570e5`](https://github.com/JacobLinCool/node-cloudflared/commit/52570e5f7c1ec1f93cf4ac38a2caae396bb30603) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Tunnel class with custom output parser

## 0.5.3

### Patch Changes

- [`b175709`](https://github.com/JacobLinCool/node-cloudflared/commit/b17570967d937b96146e9b63d51be805f18e3523) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Support macos arm64 binary starting from 2024.8.2

## 0.5.2

### Patch Changes

- [#22](https://github.com/JacobLinCool/node-cloudflared/pull/22) [`2dc1efe`](https://github.com/JacobLinCool/node-cloudflared/commit/2dc1efecc538a5bcf169d09e1f72f02d5bb643d5) Thanks [@koterpillar](https://github.com/koterpillar)! - Don't use shell to start process

## 0.5.1

### Patch Changes

- [#17](https://github.com/JacobLinCool/node-cloudflared/pull/17) [`e0627f0`](https://github.com/JacobLinCool/node-cloudflared/commit/e0627f042d05879a1688ff7517994f87e0b23b01) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Make `bin` respect `process.env.CLOUDFLARED_BIN` before choosing the default path, and it can be changed later using `use`.

## 0.5.0

### Minor Changes

- [#10](https://github.com/JacobLinCool/node-cloudflared/pull/10) [`7a611c4`](https://github.com/JacobLinCool/node-cloudflared/commit/7a611c4ce7f423aa78f86b03dc11df94b50ba4e0) Thanks [@JacobLinCool](https://github.com/JacobLinCool)! - Update the output parser to cloudflared 2023.8.2
