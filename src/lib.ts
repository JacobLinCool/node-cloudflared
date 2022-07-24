import path from "node:path";
import { install } from "./install";

/**
 * The path to the cloudflared binary.
 */
const bin = path.join(
    __dirname,
    "..",
    "bin",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
);

export { bin, install };
