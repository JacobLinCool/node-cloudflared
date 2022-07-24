import { defineConfig } from "tsup";

export default defineConfig((options) => ({
    entry: ["src/index.ts", "src/lib.ts"],
    outDir: "lib",
    target: "node14",
    format: ["cjs", "esm"],
    shims: true,
    clean: true,
    splitting: false,
    // minify: !options.watch,
    dts: options.watch ? false : { resolve: true },
}));
