const { Tunnel } = require("cloudflared");

console.log("Cloudflared Tunnel Example.");
main();

async function main() {
    // run: cloudflared tunnel --hello-world
    const tunnel = Tunnel.quick();

    // show the url
    const url = new Promise((resolve) => tunnel.once("url", resolve));
    console.log("LINK:", await url);

    const conn = new Promise((resolve) => tunnel.once("connected", resolve));
    console.log("CONN:", await conn);

    // stop the tunnel after 15 seconds
    setTimeout(tunnel.stop, 15_000);

    tunnel.on("exit", (code) => {
        console.log("tunnel process exited with code", code);
    });
}
