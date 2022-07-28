# cloudflared

Cloudflared in Node.

- Easily install `cloudflared` on macOS, Linux, and Windows.
- Typed API for creating tunnel.

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

### Extra: `bin` subcommand

There is an extra subcommand: `cloudflared bin`. You can use it to manage the cloudflared binary version.

```sh
❯ cloudflared bin --help
cloudflared bin                    : Prints the path to the binary
cloudflared bin remove             : Removes the binary
cloudflared bin install [version]  : Installs the binary
cloudflared bin help               : Prints this help message
Examples:
cloudflared bin install            : Installs the latest version of cloudflared
cloudflared bin install 2022.7.1   : Installs cloudflared 2022.7.1
You can find releases at https://github.com/cloudflare/cloudflared/releases
```

## Library Usage

### Binary Path & Install

```js
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

- `bin`: The path of the binary.
- `install`: A function that installs the binary to the given path.

### Tunnel

Checkout [`examples/tunnel.js`](examples/tunnel.js).

```js
import { tunnel } from "cloudflared";

console.log("Cloudflared Tunnel Example.");
main();

async function main() {
    // run: cloudflared tunnel --hello-world
    const { url, connections, child, stop } = tunnel({ "--hello-world": null });

    // show the url
    console.log("LINK:", await url);

    // wait for the all 4 connections to be established
    const conns = await Promise.all(connections);

    // show the connections
    console.log("Connections Ready!", conns);

    // stop the tunnel after 15 seconds
    setTimeout(stop, 15_000);

    child.on("exit", (code) => {
        console.log("tunnel process exited with code", code);
    });
}
```

```sh
❯ node examples/tunnel.js
Cloudflared Tunnel Example.
LINK: https://aimed-our-bite-brought.trycloudflare.com
Connections Ready! [
  {
    id: 'd4681cd9-217d-40e2-9e15-427f9fb77856',
    ip: '198.41.200.23',
    location: 'MIA'
  },
  {
    id: 'b40d2cdd-0b99-4838-b1eb-9a58a6999123',
    ip: '198.41.192.107',
    location: 'LAX'
  },
  {
    id: '55545211-3f63-4722-99f1-d5fea688dabf',
    ip: '198.41.200.53',
    location: 'MIA'
  },
  {
    id: 'f3d5938a-d48c-463c-a4f7-a158782a0ddb',
    ip: '198.41.192.77',
    location: 'LAX'
  }
]
tunnel process exited with code 0
```

### Service

Checkout [`examples/service.js`](examples/service.js).

```js
import { service } from "cloudflared";

console.log("Cloudflared Service Example.");
main();

async function main() {
    if (service.exists()) {
        console.log("Service is running.");
        const current = service.current();
        for (const { service, hostname } of current.config.ingress) {
            console.log(`  - ${service} -> ${hostname}`);
        }
        console.log("metrics server:", current.metrics);
    } else {
        console.log("Service is not running.");
    }
}
```

```sh
❯ node examples/service.js
Cloudflared Service Example.
Service is running.
  - http://localhost:12345 -> sub.example.com
  - http_status:404 -> undefined
metrics server: 127.0.0.1:49177/metrics
```

NOTICE: On linux, service can only be installed and uninstalled by root.

Run service test on linux: `sudo -E env "PATH=$PATH" pnpm test`
