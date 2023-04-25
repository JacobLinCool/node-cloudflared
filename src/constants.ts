import path from "node:path";

/**
 * The path to the cloudflared binary.
 */
export const bin = path.join(
    __dirname,
    "..",
    "bin",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
);

export const CLOUDFLARED_VERSION = process.env.CLOUDFLARED_VERSION || "latest";

export const RELEASE_BASE = "https://github.com/cloudflare/cloudflared/releases/";
