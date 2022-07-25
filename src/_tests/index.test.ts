import { ChildProcess } from "node:child_process";
import fs from "node:fs";
import { bin, install, tunnel } from "../lib.js";

process.env.VERBOSE = "1";

jest.setTimeout(30000);

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
