import { OptionDefaults } from "typedoc";

/** @type {Partial<import("typedoc").TypeDocOptions>} */
export default {
    entryPoints: ["./src/lib.ts"],
    out: "docs",
    // `@platform` documents which operating systems a service API supports.
    blockTags: [...OptionDefaults.blockTags, "@platform"],
};
