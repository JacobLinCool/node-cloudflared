import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ exec: vi.fn(), download: vi.fn() }));
vi.mock("node:child_process", async (original) => {
    const actual = await original<typeof import("node:child_process")>();
    const { promisify } = await import("node:util");
    return {
        ...actual,
        execFile: Object.assign(vi.fn(), { [promisify.custom]: mocks.exec }),
        execSync: vi.fn((_command: string, { cwd }: { cwd: string }) => {
            const archive = fs.readdirSync(cwd).find((file) => file.endsWith(".tgz"))!;
            fs.writeFileSync(
                path.join(cwd, "cloudflared"),
                fs.readFileSync(path.join(cwd, archive)),
            );
        }),
    };
});
vi.mock("node:https", () => ({
    default: {
        get: (url: string, callback: (response: Readable) => void) => {
            const request = Object.assign(new EventEmitter(), {
                setTimeout: vi.fn(),
                end: vi.fn(),
                destroy: vi.fn(),
            });
            queueMicrotask(() => {
                try {
                    callback(
                        Object.assign(Readable.from([mocks.download(url)]), {
                            statusCode: 200,
                            headers: {},
                        }),
                    );
                } catch (error) {
                    request.emit("error", error);
                }
            });
            return request;
        },
    },
}));

let directory: string;
let binary: string;
let downloaded: string;

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv("CLOUDFLARED_VERSION", "latest");
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "cloudflared-update-test-"));
    binary = path.join(directory, "cloudflared");
    downloaded = "2026.10.2";
    mocks.exec.mockImplementation(async (file: string) => ({
        stdout: `cloudflared version ${fs.readFileSync(file, "utf8")} (built today)\n`,
    }));
    mocks.download.mockImplementation(() => downloaded);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    fs.rmSync(directory, { recursive: true, force: true });
});

async function ensure(options: import("../install.js").InstallOptions = {}) {
    const { install } = await import("../install.js");
    return install(binary, options);
}

function writeBinary(version: string, daysOld = 0) {
    fs.writeFileSync(binary, version);
    const time = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    fs.utimesSync(binary, time, time);
}

describe("conditional install", () => {
    it("installs a missing binary through a separate staging directory", async () => {
        await expect(ensure({ minimumVersion: "2026.10.1" })).resolves.toBe(binary);
        expect(mocks.download).toHaveBeenCalledWith(expect.stringContaining("/latest/download/"));
        expect(path.dirname(mocks.exec.mock.calls[1][0])).not.toBe(directory);
        expect(fs.readFileSync(binary, "utf8")).toBe(downloaded);
        expect(fs.readdirSync(directory).sort()).toEqual(["cloudflared", "cloudflared.last-check"]);
    });

    it("updates only when the requested interval has elapsed", async () => {
        const checkInterval = 7 * 24 * 60 * 60 * 1000;
        await expect(ensure({ checkInterval: 0 })).rejects.toThrow("positive number");
        writeBinary("2026.9.0", 6);
        await ensure({ checkInterval });
        expect(mocks.download).not.toHaveBeenCalled();

        writeBinary("2026.9.0", 8);
        await ensure({ checkInterval });
        await ensure({ checkInterval });
        expect(mocks.download).toHaveBeenCalledTimes(1);
        expect(fs.readFileSync(binary, "utf8")).toBe(downloaded);
    });

    it("enforces the minimum without a periodic update interval", async () => {
        writeBinary("2026.10.2", 60);
        await ensure();
        await ensure({ checkInterval: undefined });
        await ensure({ minimumVersion: "2026.9.0" });
        expect(mocks.download).not.toHaveBeenCalled();

        downloaded = "2026.11.0";
        await ensure({ minimumVersion: "2026.10.3" });
        expect(mocks.download).toHaveBeenCalledWith(expect.stringContaining("/latest/download/"));
        expect(fs.readFileSync(binary, "utf8")).toBe(downloaded);
    });

    it("respects an exact version pin and rejects a conflicting minimum", async () => {
        vi.stubEnv("CLOUDFLARED_VERSION", downloaded);
        writeBinary(downloaded, 60);
        await ensure({ checkInterval: 7 * 24 * 60 * 60 * 1000 });
        expect(mocks.download).not.toHaveBeenCalled();

        writeBinary("2026.9.0");
        await ensure();
        expect(mocks.download).toHaveBeenCalledWith(
            expect.stringContaining(`/download/${downloaded}/`),
        );
        expect(fs.readFileSync(binary, "utf8")).toBe(downloaded);
        await expect(ensure({ minimumVersion: "2026.11.0" })).rejects.toThrow(
            "CLOUDFLARED_VERSION is older than minimumVersion",
        );
    });

    it.each(["download", "replacement"])(
        "keeps the working binary after a failed %s and waits before retrying",
        async (failure) => {
            writeBinary("2026.9.0", 31);
            if (failure === "download") {
                mocks.download.mockImplementation(() => {
                    throw new Error("offline");
                });
            } else {
                vi.spyOn(fs, "renameSync").mockImplementation(() => {
                    throw new Error("EBUSY");
                });
            }
            await ensure({ checkInterval: 30 * 24 * 60 * 60 * 1000 });
            await ensure({ checkInterval: 30 * 24 * 60 * 60 * 1000 });
            expect(mocks.download).toHaveBeenCalledTimes(1);
            expect(fs.readFileSync(binary, "utf8")).toBe("2026.9.0");
            expect(fs.readdirSync(directory).sort()).toEqual([
                "cloudflared",
                "cloudflared.last-check",
            ]);
        },
    );

    it("propagates required installation failures without damaging the installed binary", async () => {
        mocks.download.mockImplementation(() => {
            throw new Error("offline");
        });
        writeBinary("2026.9.0");
        await expect(ensure({ minimumVersion: downloaded })).rejects.toThrow("offline");
        expect(fs.readFileSync(binary, "utf8")).toBe("2026.9.0");

        fs.unlinkSync(binary);
        await expect(ensure()).rejects.toThrow("offline");
        expect(fs.existsSync(binary)).toBe(false);
    });
});

describe("latest or specified version installation", () => {
    it("always downloads with omitted or explicit versions", async () => {
        writeBinary(downloaded);
        const { install } = await import("../install.js");
        await install(binary);
        expect(mocks.download).toHaveBeenLastCalledWith(
            expect.stringContaining("/latest/download/"),
        );
        await install(binary, downloaded);
        expect(mocks.download).toHaveBeenLastCalledWith(
            expect.stringContaining(`/download/${downloaded}/`),
        );
        expect(mocks.download).toHaveBeenCalledTimes(2);
        expect(mocks.exec).not.toHaveBeenCalled();
    });
});
