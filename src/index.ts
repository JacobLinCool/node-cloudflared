import fs from "node:fs";
import { spawn } from "node:child_process";
import { bin, install } from "./lib";

main();

async function main() {
    if (!fs.existsSync(bin)) {
        console.log("Installed cloudflared to " + (await install(bin)));
    }

    const args = process.argv.slice(2);

    if (args[0] === "remove-bin") {
        fs.unlinkSync(bin);
        console.log("Removed cloudflared");
        process.exit(0);
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
