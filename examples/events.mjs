import { Tunnel, ConfigHandler } from "cloudflared";

const token = process.env.CLOUDFLARED_TOKEN;
if (!token) {
    throw new Error("CLOUDFLARED_TOKEN is not set");
}

const tunnel = Tunnel.withToken(token);
const handler = new ConfigHandler(tunnel);

handler.on("config", ({ config }) => {
    console.log("Config", config);
});

tunnel.on("url", (url) => {
    console.log("Tunnel is ready at", url);
});

tunnel.on("connected", (connection) => {
    console.log("Connected to", connection);
});

tunnel.on("disconnected", (connection) => {
    console.log("Disconnected from", connection);
});

tunnel.on("stdout", (data) => {
    console.log("Tunnel stdout", data);
});

tunnel.on("stderr", (data) => {
    console.error("Tunnel stderr", data);
});

tunnel.on("exit", (code, signal) => {
    console.log("Tunnel exited with code", code, "and signal", signal);
});

tunnel.on("error", (error) => {
    console.error("Error", error);
});

process.on("SIGINT", () => {
    console.log("Tunnel stopped", tunnel.stop());
});
