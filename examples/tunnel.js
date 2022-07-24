import { tunnel } from "../lib/lib.js";

console.log("Cloudflared Tunnel Example.");
main();

async function main() {
    // run: cloudflared tunnel --hello-world
    const { url, connections, child, stop } = tunnel({ "hello-world": null });

    // show the url
    console.log("LINK:", await url);

    // wait for the all 4 connections to be established
    const conns = await Promise.all(connections);

    // show the connections
    console.log("Connections Ready!", conns);

    // stop the tunnel after 15 seconds
    setTimeout(stop, 15_000);

    child.on("exit", (code) => {
        console.log("tunnel process exited with code", code);
    });
}
