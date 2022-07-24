import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { install } from "./install";

const exe = path.join(
    __dirname,
    "..",
    "bin",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
);

main();

async function main() {
    if (!fs.existsSync(exe)) {
        console.log("Installed cloudflared to " + (await install(exe)));
    }

    const args = process.argv.slice(2);

    if (args[0] === "remove-bin") {
        fs.unlinkSync(exe);
        console.log("Removed cloudflared");
        process.exit(0);
    }

    const sub = spawn(exe, args, { shell: true, stdio: "inherit" });

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
