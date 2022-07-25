import { ChildProcess } from "node:child_process";
import fs from "node:fs";
import { bin, install, tunnel, service } from "../lib.js";

process.env.VERBOSE = "1";

jest.setTimeout(60_000);

describe("install", () => {
    it("should install binary", async () => {
        if (fs.existsSync(bin)) {
            fs.unlinkSync(bin);
        }
        expect(fs.existsSync(bin)).toBe(false);

        await install(bin);
        expect(fs.existsSync(bin)).toBe(true);
    });
});

describe("tunnel", () => {
    it("should create a tunnel", async () => {
        const { url, connections, child, stop } = tunnel();
        expect(await url).toMatch(/https?:\/\/[^\s]+/);
        const conns = await Promise.all(connections);
        expect(conns.length).toBe(4);
        expect(child).toBeInstanceOf(ChildProcess);
        stop();
    });
});

describe("service", () => {
    const TOKEN = process.env.TUNNEL_TOKEN;
    if (
        TOKEN &&
        ["darwin", "linux"].includes(process.platform) &&
        !(process.platform === "linux" && process.getuid?.() !== 0)
    ) {
        beforeAll(() => {
            if (service.exists()) {
                service.uninstall();
            }
        });

        it("should work", async () => {
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
    }
});
