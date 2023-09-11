import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";
import { CLOUDFLARED_VERSION, RELEASE_BASE } from "./constants";
import { UnsupportedError } from "./error";

const LINUX_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "cloudflared-linux-arm64",
    arm: "cloudflared-linux-arm",
    x64: "cloudflared-linux-amd64",
    ia32: "cloudflared-linux-386",
};

const MACOS_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "cloudflared-darwin-amd64.tgz",
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
 * @param to The path to the binary to install.
 * @param version The version of cloudflared to install.
 * @returns The path to the binary that was installed.
 */
export async function install(to: string, version = CLOUDFLARED_VERSION): Promise<string> {
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
    const file = MACOS_URL[process.arch];

    if (file === undefined) {
        throw new UnsupportedError("Unsupported architecture: " + process.arch);
    }

    await download(resolve_base(version) + file, `${to}.tgz`);
    process.env.VERBOSE && console.log(`Extracting to ${to}`);
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
    if (redirect === 0) {
        process.env.VERBOSE && console.log(`Downloading ${url} to ${to}`);
    } else {
        process.env.VERBOSE && console.log(`Redirecting to ${url}`);
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

                file.on("finish", () => {
                    file.close(() => resolve(to));
                });

                file.on("error", (err) => {
                    fs.unlink(to, () => reject(err));
                });

                res.pipe(file);
            } else {
                request.destroy();
                reject(new Error(`HTTP response with status code: ${res.statusCode}`));
            }
        });

        request.on("error", (err) => {
            reject(err);
        });

        request.end();
    });
}
