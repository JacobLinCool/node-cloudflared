#!/usr/bin/env node
import { UnsupportedError } from "./error.js";
import { main } from "./index.js";

main().catch((err) => {
    if (err instanceof UnsupportedError) {
        console.error(err.message);
        process.exit(1);
    }
});
