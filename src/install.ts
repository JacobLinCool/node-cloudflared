import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { execSync } from "node:child_process";

const LINUX_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64",
    arm: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm",
    x64: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64",
    ia32: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-386",
};

const MACOS_URL: Partial<Record<typeof process.arch, string>> = {
    arm64: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz",
    x64: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz",
};

const WINDOWS_URL: Partial<Record<typeof process.arch, string>> = {
    x64: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe",
    ia32: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-386.exe",
};

export async function install(to: string): Promise<string> {
    if (process.platform === "linux") {
        return install_linux(to);
    } else if (process.platform === "darwin") {
        return install_macos(to);
    } else if (process.platform === "win32") {
        return install_windows(to);
    } else {
        console.error("Unsupported platform: " + process.platform);
        process.exit(1);
    }
}

export async function install_linux(to: string): Promise<string> {
    const url = LINUX_URL[process.arch];

    if (url === undefined) {
        console.error("Unsupported architecture: " + process.arch);
        process.exit(1);
    }

    await download(url, to);
    return to;
}
export async function install_macos(to: string): Promise<string> {
    const url = MACOS_URL[process.arch];

    if (url === undefined) {
        console.error("Unsupported architecture: " + process.arch);
        process.exit(1);
    }

    await download(url, `${to}.tgz`);
    process.env.VERBOSE && console.log(`Extracting to ${to}`);
    execSync(`tar -xzf ${path.basename(`${to}.tgz`)}`, { cwd: path.dirname(to) });
    fs.unlinkSync(`${to}.tgz`);
    return to;
}
export async function install_windows(to: string): Promise<string> {
    const url = WINDOWS_URL[process.arch];

    if (url === undefined) {
        console.error("Unsupported architecture: " + process.arch);
        process.exit(1);
    }

    await download(url, to);
    return to;
}

function download(url: string, to: string, redirect = 0): Promise<string> {
    if (redirect === 0) {
        process.env.VERBOSE && console.log(`Downloading ${url} to ${to}`);
    } else {
        process.env.VERBOSE && console.log(`Redirecting to ${url}`);
    }

    return new Promise<string>((resolve, reject) => {
        if (!fs.existsSync(path.dirname(to))) {
            fs.mkdirSync(path.dirname(to), { recursive: true });
        }

        let done = true;
        const file = fs.createWriteStream(to);
        const request = https.get(url, (res) => {
            if (res.statusCode === 302 && res.headers.location !== undefined) {
                done = false;
                file.close();
                resolve(download(res.headers.location, to, redirect + 1));
                return;
            }
            res.pipe(file);
        });

        file.on("finish", () => {
            if (done) {
                resolve(to);
            }
        });

        request.on("error", (err) => {
            fs.unlink(to, () => reject(err));
        });

        file.on("error", (err) => {
            fs.unlink(to, () => reject(err));
        });

        request.end();
    });
}
