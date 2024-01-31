import path from "node:path";

export const DEFAULT_CLOUDFLARED_BIN = path.join(
    __dirname,
    "..",
    "bin",
    process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
);

/**
 * The path to the cloudflared binary.
 * If the `CLOUDFLARED_BIN` environment variable is set, it will be used; otherwise, {@link DEFAULT_CLOUDFLARED_BIN} will be used.
 * Can be overridden with {@link use}.
 */
export let bin = process.env.CLOUDFLARED_BIN || DEFAULT_CLOUDFLARED_BIN;

/**
 * Override the path to the cloudflared binary.
 * @param executable - The path to the cloudflared executable.
 */
export function use(executable: string): void {
    bin = executable;
}

export const CLOUDFLARED_VERSION = process.env.CLOUDFLARED_VERSION || "latest";

export const RELEASE_BASE = "https://github.com/cloudflare/cloudflared/releases/";
