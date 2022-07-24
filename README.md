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
import { bin, install } from "cloudflared";
import fs from "node:fs";
import { spawn } from "node:child_process";

if (!fs.existsSync(bin)) {
    // install cloudflared binary
    await install(bin);
}

// run cloudflared
spawn(bin, ["--version"], { stdio: "inherit" });
```

`bin`: The path of the binary.
`install`: A function that installs the binary to the given path.
