import os from "node:os";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { bin } from "./constants.js";
import { Connection } from "./types.js";

/**
 * Cloudflared launchd identifier.
 */
export const identifier = "com.cloudflare.cloudflared";

/**
 * Path of service related files.
 */
export const MACOS_SERVICE_PATH = {
    PLIST: is_root()
        ? `/Library/LaunchDaemons/${identifier}.plist`
        : `${os.homedir()}/Library/LaunchAgents/${identifier}.plist`,
    OUT: is_root()
        ? `/Library/Logs/${identifier}.out.log`
        : `${os.homedir()}/Library/Logs/${identifier}.out.log`,
    ERR: is_root()
        ? `/Library/Logs/${identifier}.err.log`
        : `${os.homedir()}/Library/Logs/${identifier}.err.log`,
};

/**
 * Cloudflared Service API.
 */
export const service = { install, uninstall, exists, log, err, current };

/**
 * Throw when service is already installed.
 */
export class AlreadyInstalledError extends Error {
    constructor() {
        super("service is already installed");
    }
}

/**
 * Throw when service is not installed.
 */
export class NotInstalledError extends Error {
    constructor() {
        super("service is not installed");
    }
}

/**
 * Install Cloudflared service.
 * @param token Tunnel service token.
 */
export function install(token: string): void {
    if (process.platform !== "darwin") {
        throw new Error(`Not Implemented on platform ${process.platform}`);
    }

    if (exists()) {
        throw new AlreadyInstalledError();
    }

    spawnSync(bin, ["service", "install", token]);
}

/**
 * Uninstall Cloudflared service.
 */
export function uninstall(): void {
    if (process.platform !== "darwin") {
        throw new Error(`Not Implemented on platform ${process.platform}`);
    }

    if (!exists()) {
        throw new NotInstalledError();
    }

    spawnSync(bin, ["service", "uninstall"]);

    fs.rmSync(MACOS_SERVICE_PATH.OUT);
    fs.rmSync(MACOS_SERVICE_PATH.ERR);
}

/**
 * Get stdout log of cloudflared service. (Usually empty)
 * @returns stdout log of cloudflared service.
 */
export function log(): string {
    if (process.platform !== "darwin") {
        throw new Error(`Not Implemented on platform ${process.platform}`);
    }

    if (!exists()) {
        throw new NotInstalledError();
    }

    return fs.readFileSync(MACOS_SERVICE_PATH.OUT, "utf8");
}

/**
 * Get stderr log of cloudflared service. (cloudflared print all things here)
 * @returns stderr log of cloudflared service.
 */
export function err(): string {
    if (process.platform !== "darwin") {
        throw new Error(`Not Implemented on platform ${process.platform}`);
    }

    if (!exists()) {
        throw new NotInstalledError();
    }

    return fs.readFileSync(MACOS_SERVICE_PATH.ERR, "utf8");
}

/**
 * Get informations of current running cloudflared service.
 * @returns informations of current running cloudflared service.
 */
export function current(): {
    /** Tunnel ID */
    tunnelID: string;
    /** Connector ID */
    connectorID: string;
    /** The connections of the tunnel */
    connections: Connection[];
    /** Metrics Server Location */
    metrics: string;
    /** Tunnel Configuration */
    config: {
        ingress: { service: string; hostname?: string }[];
        [key: string]: unknown;
    };
} {
    if (process.platform !== "darwin") {
        throw new Error(`Not Implemented on platform ${process.platform}`);
    }

    if (!exists()) {
        throw new NotInstalledError();
    }

    const error = err();

    const regex = {
        tunnelID: /tunnelID=([0-9a-z-]+)/g,
        connectorID: /Connector ID: ([0-9a-z-]+)/g,
        connections:
            /Connection ([a-z0-9-]+) registered connIndex=(\d) ip=([0-9.]+) location=([A-Z]+)/g,
        metrics: /metrics server on ([0-9.:]+\/metrics)/g,
        config: /config="(.+[^\\])"/g,
    };

    const match = {
        tunnelID: regex.tunnelID.exec(error),
        connectorID: regex.connectorID.exec(error),
        connections: error.matchAll(regex.connections),
        metrics: regex.metrics.exec(error),
        config: regex.config.exec(error),
    };

    const config = (() => {
        try {
            return JSON.parse(match.config?.[1].replace(/\\/g, "") ?? "{}");
        } catch (e) {
            return {};
        }
    })();

    return {
        tunnelID: match.tunnelID?.[1] ?? "",
        connectorID: match.connectorID?.[1] ?? "",
        connections:
            [...match.connections].map(([, id, , ip, location]) => ({
                id,
                ip,
                location,
            })) ?? [],
        metrics: match.metrics?.[1] ?? "",
        config,
    };
}

/**
 * Check if cloudflared service is installed.
 * @returns true if service is installed, false otherwise.
 */
export function exists(): boolean {
    return is_root()
        ? fs.existsSync(MACOS_SERVICE_PATH.PLIST)
        : fs.existsSync(MACOS_SERVICE_PATH.PLIST);
}

function is_root(): boolean {
    return process.getuid?.() === 0;
}
