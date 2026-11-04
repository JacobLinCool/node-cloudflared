import { execFile, execSync } from "node:child_process";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { pipeline } from "node:stream";
import { promisify } from "node:util";
import { CLOUDFLARED_VERSION, RELEASE_BASE } from "./constants";
import { UnsupportedError } from "./error";

const exec = promisify(execFile);

export interface InstallOptions {
    /** Always upgrade binaries older than this version, regardless of the check interval. */
    minimumVersion?: string;
    /** Enable periodic updates to the newest version by specifying the period in milliseconds. */
    checkInterval?: number;
}

const LINUX_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "cloudflared-linux-arm64",
    arm: "cloudflared-linux-arm",
    x64: "cloudflared-linux-amd64",
    ia32: "cloudflared-linux-386",
};

const MACOS_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "cloudflared-darwin-arm64.tgz",
    x64: "cloudflared-darwin-amd64.tgz",
};

const WINDOWS_URL: Partial<Record<typeof process.arch, string>> = {
    x64: "cloudflared-windows-amd64.exe",
    ia32: "cloudflared-windows-386.exe",
};

function resolve_base(version: string): string {
    if (version === "latest") {
        return `${RELEASE_BASE}latest/download/`;
    }
    return `${RELEASE_BASE}download/${version}/`;
}

/**
 * Install cloudflared to the given path.
 * Pass a version string (or omit it) to always download.
 * Pass options to install only when missing, below the minimum, or to periodically reinstall an updated version.
 * Optional refresh failures keep the installed binary; required installations throw.
 * @param to The path to the binary to install.
 * @param version A version to download, or options for conditional installation.
 * @returns The path to the installed binary.
 */
export async function install(
    to: string,
    version: string | InstallOptions = CLOUDFLARED_VERSION,
): Promise<string> {
    if (typeof version === "string") {
        return installExact(to, version);
    }

    const { minimumVersion, checkInterval } = version;
    if (checkInterval !== undefined && (!Number.isFinite(checkInterval) || checkInterval <= 0)) {
        throw new Error("checkInterval must be a finite, positive number");
    }
    const pinned = CLOUDFLARED_VERSION !== "latest" ? CLOUDFLARED_VERSION : undefined;
    if (minimumVersion !== undefined) validateVersion(minimumVersion);
    if (pinned) {
        validateVersion(pinned);
        if (minimumVersion && compareVersions(pinned, minimumVersion) < 0) {
            throw new Error("CLOUDFLARED_VERSION is older than minimumVersion");
        }
    }

    const current = await binaryVersion(to).catch(() => undefined);
    const required =
        !current ||
        (pinned !== undefined && current !== pinned) ||
        (minimumVersion !== undefined && compareVersions(current, minimumVersion) < 0);
    const checked = `${to}.last-check`;

    if (!required) {
        if (pinned || checkInterval === undefined) return to;
        const lastCheck = fs.existsSync(checked) ? checked : to;
        if (Date.now() - fs.statSync(lastCheck).mtimeMs < checkInterval) return to;
    }

    let temporary: string | undefined;
    try {
        fs.mkdirSync(path.dirname(to), { recursive: true });
        // Record attempts too, so offline users do not retry a refresh on every invocation.
        fs.writeFileSync(checked, "");
        temporary = fs.mkdtempSync(path.join(path.dirname(to), ".cloudflared-"));
        const candidate = path.join(
            temporary,
            process.platform === "win32" ? "cloudflared.exe" : "cloudflared",
        );
        await installExact(candidate, pinned || "latest");
        const downloaded = await binaryVersion(candidate);
        if (
            (pinned && downloaded !== pinned) ||
            (minimumVersion && compareVersions(downloaded, minimumVersion) < 0)
        ) {
            throw new Error(
                `Downloaded cloudflared ${downloaded} does not meet the requested version`,
            );
        }
        // Never downgrade a working binary during an optional refresh.
        if (!required && current && compareVersions(downloaded, current) <= 0) return to;
        fs.renameSync(candidate, to);
    } catch (error) {
        if (required) throw error;
        if (process.env.VERBOSE) console.warn("Could not refresh cloudflared:", error);
    } finally {
        if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
    }
    return to;
}

async function installExact(to: string, version: string): Promise<string> {
    if (process.platform === "linux") {
        return install_linux(to, version);
    } else if (process.platform === "darwin") {
        return install_macos(to, version);
    } else if (process.platform === "win32") {
        return install_windows(to, version);
    } else {
        throw new UnsupportedError("Unsupported platform: " + process.platform);
    }
}

export async function install_linux(to: string, version = CLOUDFLARED_VERSION): Promise<string> {
    const file = LINUX_URL[process.arch];

    if (file === undefined) {
        throw new UnsupportedError("Unsupported architecture: " + process.arch);
    }

    await download(resolve_base(version) + file, to);
    fs.chmodSync(to, "755");
    return to;
}

export async function install_macos(to: string, version = CLOUDFLARED_VERSION): Promise<string> {
    let arch = process.arch;
    if (version !== "latest" && compareVersions(version, "2024.8.2") < 0) {
        // arm64 is only supported starting from 2024.8.2
        arch = "x64";
    }
    const file = MACOS_URL[arch];

    if (file === undefined) {
        throw new UnsupportedError("Unsupported architecture: " + arch);
    }

    await download(resolve_base(version) + file, `${to}.tgz`);
    if (process.env.VERBOSE) console.log(`Extracting to ${to}`);
    execSync(`tar -xzf ${path.basename(`${to}.tgz`)}`, { cwd: path.dirname(to) });
    fs.unlinkSync(`${to}.tgz`);
    fs.renameSync(`${path.dirname(to)}/cloudflared`, to);
    return to;
}
export async function install_windows(to: string, version = CLOUDFLARED_VERSION): Promise<string> {
    const file = WINDOWS_URL[process.arch];

    if (file === undefined) {
        throw new UnsupportedError("Unsupported architecture: " + process.arch);
    }

    await download(resolve_base(version) + file, to);
    return to;
}

function download(url: string, to: string, redirect = 0): Promise<string> {
    if (process.env.VERBOSE) {
        console.log(redirect === 0 ? `Downloading ${url} to ${to}` : `Redirecting to ${url}`);
    }

    if (!fs.existsSync(path.dirname(to))) {
        fs.mkdirSync(path.dirname(to), { recursive: true });
    }

    return new Promise<string>((resolve, reject) => {
        const request = https.get(url, (res) => {
            const redirect_code: unknown[] = [301, 302, 303, 307, 308];
            if (redirect_code.includes(res.statusCode) && res.headers.location !== undefined) {
                request.destroy();
                const redirection = res.headers.location;
                resolve(download(redirection, to, redirect + 1));
                return;
            }

            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                const file = fs.createWriteStream(to);

                pipeline(res, file, (err) => {
                    if (err) {
                        fs.unlink(to, () => reject(err));
                    } else {
                        resolve(to);
                    }
                });
            } else {
                request.destroy();
                reject(new Error(`HTTP response with status code: ${res.statusCode}`));
            }
        });

        request.on("error", (err) => {
            reject(err);
        });
        request.setTimeout(30_000, () =>
            request.destroy(new Error("cloudflared download timed out")),
        );

        request.end();
    });
}

async function binaryVersion(file: string): Promise<string> {
    const { stdout } = await exec(file, ["--version"], { timeout: 5_000, windowsHide: true });
    const match = /^cloudflared version (\d+\.\d+\.\d+)(?:\s|$)/.exec(stdout);
    if (!match) throw new Error(`Cannot read cloudflared version from ${file}`);
    return match[1];
}

function validateVersion(version: string): void {
    if (!/^\d+\.\d+\.\d+$/.test(version)) {
        throw new Error(`Invalid cloudflared version: ${version}`);
    }
}

function compareVersions(left: string, right: string): number {
    validateVersion(left);
    validateVersion(right);
    const a = left.split(".").map(Number);
    const b = right.split(".").map(Number);
    return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
