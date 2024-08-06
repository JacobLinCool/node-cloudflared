const { service } = require("cloudflared");

console.log("Cloudflared Service Example.");
main();

async function main() {
    if (service.exists()) {
        console.log("Service is running.");
        const current = service.current();
        for (const { service, hostname } of current.config.ingress) {
            console.log(`  - ${service} -> ${hostname}`);
        }
        console.log("metrics server:", current.metrics);
    } else {
        console.log("Service is not running.");
    }
}
