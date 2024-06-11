import fs from "node:fs";
import https from "node:https";
import { spawn } from "node:child_process";
import { bin, install } from "./lib.js";
import { CLOUDFLARED_VERSION } from "./constants.js";

export async function main(): Promise<void> {
    const args = process.argv.slice(2);

    if (args[0] === "bin") {
        if (!args[1]) {
            console.log(bin);
            return;
        }
        if (args[1] === "remove") {
            fs.unlinkSync(bin);
            console.log("Removed cloudflared");
            return;
        }
        if (args[1] === "install") {
            const version = args[2] || CLOUDFLARED_VERSION;
            if (version !== "latest") {
                console.log(`Installing cloudflared ${args[2]}`);
                console.log(await install(bin, args[2]));
            } else {
                console.log("Installing latest version of cloudflared");
                await install(bin, version);
            }
            return;
        }
        if (args[1] === "list") {
            https.get(
                {
                    hostname: "api.github.com",
                    path: "/repos/cloudflare/cloudflared/releases",
                    headers: {
                        "user-agent": "node-cloudflared",
                    },
                },
                (res) => {
                    let data = "";
                    res.on("data", (chunk) => {
                        data += chunk;
                    });
                    res.on("end", () => {
                        const releases = JSON.parse(data);
                        for (const release of releases) {
                            console.log(
                                `${release.tag_name.padEnd(10)} (${release.published_at}) [${
                                    release.html_url
                                }]`,
                            );
                        }
                    });
                },
            );
            return;
        }
        if (args[1] === "help" || args[1] === "--help" || args[1] === "-h") {
            console.log(`cloudflared bin                    : Prints the path to the binary`);
            console.log(`cloudflared bin remove             : Removes the binary`);
            console.log(`cloudflared bin install [version]  : Installs the binary`);
            console.log(`cloudflared bin list               : Lists 30 latest releases`);
            console.log(`cloudflared bin help               : Prints this help message`);
            console.log(`Examples:`);
            console.log(
                `cloudflared bin install            : Installs the latest version of cloudflared`,
            );
            console.log(`cloudflared bin install 2023.4.1   : Installs cloudflared 2023.4.1`);
            console.log(
                `You can find releases at https://github.com/cloudflare/cloudflared/releases`,
            );
            return;
        }
    }

    if (!fs.existsSync(bin)) {
        console.log("Installed cloudflared to " + (await install(bin)));
    }

    const sub = spawn(bin, args, { stdio: "inherit" });

    sub.on("exit", (code) => {
        if (typeof code === "number") {
            process.exit(code);
        } else {
            process.exit(1);
        }
    });

    const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM", "SIGQUIT"];
    for (const signal of signals) {
        process.on(signal, () => {
            sub.kill(signal);
        });
    }
}
