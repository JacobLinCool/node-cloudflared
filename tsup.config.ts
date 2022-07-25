import { defineConfig } from "tsup";

export default defineConfig((options) => ({
    entry: ["src/*.ts"],
    outDir: "lib",
    target: "node14",
    format: ["cjs", "esm"],
    shims: true,
    clean: true,
    splitting: false,
    bundle: false,
    dts: options.watch ? false : { entry: "src/lib.ts" },
}));
