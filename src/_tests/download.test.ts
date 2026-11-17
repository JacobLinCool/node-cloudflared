import { EventEmitter } from "node:events";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { install_linux } from "../install.js";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("node:https", () => ({ default: { get: mocks.get } }));

let directory: string;
let binary: string;
let response: PassThrough & { statusCode: number };
let request: EventEmitter & {
    destroy: ReturnType<typeof vi.fn>;
    setTimeout: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "cloudflared-download-test-"));
    binary = path.join(directory, "cloudflared");
    response = Object.assign(new PassThrough(), { statusCode: 200 });
    request = Object.assign(new EventEmitter(), {
        destroy: vi.fn((error?: Error) => {
            if (error) request.emit("error", error);
        }),
        setTimeout: vi.fn(),
        end: vi.fn(),
    });
    mocks.get.mockImplementation((_url, callback) => {
        queueMicrotask(() => callback(response));
        return request;
    });
});

afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
});

describe("download", () => {
    it("rejects an interrupted response and removes the partial file", async () => {
        const installed = install_linux(binary, "2026.10.2");
        queueMicrotask(() => {
            response.write("partial binary");
            response.destroy(new Error("connection reset"));
        });
        await expect(installed).rejects.toThrow("connection reset");
        expect(fs.existsSync(binary)).toBe(false);
    });

    it("bounds stalled download requests", async () => {
        mocks.get.mockReturnValue(request);
        const installed = install_linux(binary, "2026.10.2");
        expect(request.setTimeout).toHaveBeenCalledWith(30_000, expect.any(Function));
        request.setTimeout.mock.calls[0][1]();
        await expect(installed).rejects.toThrow("download timed out");
    });
});
