import { ChildProcess } from "node:child_process";
import fs from "node:fs";
import { Tunnel, bin, install, service } from "../lib.js";
import { describe, it, expect, beforeAll } from "vitest";

process.env.VERBOSE = "1";

describe(
    "install",
    { timeout: 60_000 },
    () => {
        it("should install binary", async () => {
            if (fs.existsSync(bin)) {
                fs.unlinkSync(bin);
            }
            expect(fs.existsSync(bin)).toBe(false);

            await install(bin);
            expect(fs.existsSync(bin)).toBe(true);
        });
    },
);

describe(
    "tunnel",
    { timeout: 60_000 },
    () => {
        it("should create a tunnel", async () => {
            const tunnel = new Tunnel(["tunnel", "--url", "localhost:8080", "--no-autoupdate"]);
            const url = new Promise((resolve) => tunnel.once("url", resolve));
            expect(await url).toMatch(/https?:\/\/[^\s]+/);
            const conn = new Promise((resolve) => tunnel.once("connected", resolve));
            await conn; // quick tunnel only has one connection
            expect(tunnel.process).toBeInstanceOf(ChildProcess);
            tunnel.stop();
        });
    },
);

describe("service", { timeout: 60_000 }, () => {
    const TOKEN = process.env.TUNNEL_TOKEN;
    const should_run =
        TOKEN &&
        ["darwin", "linux"].includes(process.platform) &&
        !(process.platform === "linux" && process.getuid?.() !== 0);
    if (should_run) {
        beforeAll(() => {
            if (service.exists()) {
                service.uninstall();
            }
        });
    }

    it("should work", async (ctx) => {
        if (!should_run) {
            ctx.skip();
        }
        expect(service.exists()).toBe(false);
        service.install(TOKEN);

        await new Promise((r) => setTimeout(r, 15_000));

        expect(service.exists()).toBe(true);
        const current = service.current();
        expect(current.tunnelID.length).toBeGreaterThan(0);
        expect(current.connectorID.length).toBeGreaterThan(0);
        expect(current.connections.length).toBeGreaterThan(0);
        expect(current.metrics.length).toBeGreaterThan(0);
        expect(current.config.ingress?.length).toBeGreaterThan(0);

        service.uninstall();
    });
});
