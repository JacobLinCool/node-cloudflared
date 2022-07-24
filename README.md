# cloudflared

Install Cloudflared in Node.

> This tool will automatically install the [latest version of `cloudflared`](https://github.com/cloudflare/cloudflared/releases/latest) at the first time.
> Then, it just passes down the command to `cloudflared`.

## Installation

### PNPM

```sh
pnpm i -g cloudflared
```

### NPM

```sh
npm i -g cloudflared
```

### Yarn

```sh
yarn global add cloudflared
```

## Usage

You can find the usage of `cloudflared` here: <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-useful-commands/>

Or just try:

```sh
cloudflared --help
```

### Extra Things

There is an extra command: `cloudflared remove-bin`, which will remove the `cloudflared` binary that is installed by this package.

## Library Usage

```ts
import { install } from "cloudflared";

// install cloudflared binary
install("where/to/install/executable");
```
