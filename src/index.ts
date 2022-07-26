import fs from "node:fs";
import { spawn } from "node:child_process";
import { bin, install } from "./lib.js";

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
            if (args[2]) {
                console.log(`Installing cloudflared ${args[2]}`);
                console.log(await install(bin, args[2]));
            } else {
                console.log("Installing latest version of cloudflared");
                await install(bin);
            }
            return;
        }
        if (args[1] === "help" || args[1] === "--help" || args[1] === "-h") {
            console.log(`cloudflared bin                    : Prints the path to the binary`);
            console.log(`cloudflared bin remove             : Removes the binary`);
            console.log(`cloudflared bin install [version]  : Installs the binary`);
            console.log(`cloudflared bin help               : Prints this help message`);
            console.log(`Examples:`);
            console.log(
                `cloudflared bin install            : Installs the latest version of cloudflared`,
            );
            console.log(`cloudflared bin install 2022.7.1   : Installs cloudflared 2022.7.1`);
            console.log(
                `You can find releases at https://github.com/cloudflare/cloudflared/releases`,
            );
            return;
        }
    }

    if (!fs.existsSync(bin)) {
        console.log("Installed cloudflared to " + (await install(bin)));
    }

    const sub = spawn(bin, args, { shell: true, stdio: "inherit" });

    sub.on("exit", (code) => {
        if (typeof code === "number") {
            process.exit(code);
        } else {
            process.exit(1);
        }
    });

    process.on("SIGINT", () => {
        sub.kill("SIGINT");
    });
}
