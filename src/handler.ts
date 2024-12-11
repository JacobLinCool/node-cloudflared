import { EventEmitter } from "node:stream";
import { conn_regex, ip_regex, location_regex, index_regex } from "./regex";
import type { OutputHandler, Tunnel } from "./tunnel.js";
import type { Connection } from "./types.js";

export class ConnectionHandler {
    private connections: (Connection | undefined)[] = [];

    constructor(tunnel: Tunnel) {
        tunnel.addHandler(this.connected_handler.bind(this));
        tunnel.addHandler(this.disconnected_handler.bind(this));
    }

    private connected_handler: OutputHandler = (output, tunnel) => {
        // Registered tunnel connection connIndex=0 connection=4db5ec6e-4076-45c5-8752-745071bc2567 event=0 ip=198.41.200.193 location=tpe01 protocol=quic
        const conn_match = output.match(conn_regex);
        const ip_match = output.match(ip_regex);
        const location_match = output.match(location_regex);
        const index_match = output.match(index_regex);

        if (conn_match && ip_match && location_match && index_match) {
            const connection = {
                id: conn_match[1],
                ip: ip_match[1],
                location: location_match[1],
            };
            this.connections[Number(index_match[1])] = connection;
            tunnel.emit("connected", connection);
        }
    };

    private disconnected_handler: OutputHandler = (output, tunnel) => {
        // Connection terminated error="connection with edge closed" connIndex=1
        const index_match = output.includes("terminated") ? output.match(index_regex) : null;
        if (index_match) {
            const index = Number(index_match[1]);
            if (this.connections[index]) {
                tunnel.emit("disconnected", this.connections[index]);
                this.connections[index] = undefined;
            }
        }
    };
}

export class TryCloudflareHandler {
    constructor(tunnel: Tunnel) {
        tunnel.addHandler(this.url_handler.bind(this));
    }

    private url_handler: OutputHandler = (output, tunnel) => {
        // https://xxxxxxxxxx.trycloudflare.com
        const url_match = output.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/);
        if (url_match) {
            tunnel.emit("url", url_match[0]);
        }
    };
}

export interface ConfigHandlerEvents<T> {
    config: (config: { config: T; version: number }) => void;
    error: (error: Error) => void;
}

export interface TunnelConfig {
    ingress: Record<string, string>[];
    warp_routing: { enabled: boolean };
}

export class ConfigHandler<T = TunnelConfig> extends EventEmitter {
    constructor(tunnel: Tunnel) {
        super();
        tunnel.addHandler(this.config_handler.bind(this));
    }

    private config_handler: OutputHandler = (output, tunnel) => {
        // Updated to new configuration config="{\"ingress\":[{\"hostname\":\"host.mydomain.com\", \"service\":\"http://localhost:1234\"}, {\"service\":\"http_status:404\"}], \"warp-routing\":{\"enabled\":false}}" version=1
        const config_match = output.match(/\bconfig="(.+?)" version=(\d+)/);

        if (config_match) {
            try {
                // Parse the escaped JSON string
                const config_str = config_match[1].replace(/\\"/g, '"');
                const config: T = JSON.parse(config_str);
                const version = parseInt(config_match[2], 10);

                this.emit("config", {
                    config,
                    version,
                });

                if (
                    config &&
                    typeof config === "object" &&
                    "ingress" in config &&
                    Array.isArray(config.ingress)
                ) {
                    for (const ingress of config.ingress) {
                        if ("hostname" in ingress) {
                            tunnel.emit("url", ingress.hostname);
                        }
                    }
                }
            } catch (error) {
                this.emit("error", new Error(`Failed to parse config: ${error}`));
            }
        }
    };

    public on<E extends keyof ConfigHandlerEvents<T>>(
        event: E,
        listener: ConfigHandlerEvents<T>[E],
    ): this {
        return super.on(event, listener);
    }
    public once<E extends keyof ConfigHandlerEvents<T>>(
        event: E,
        listener: ConfigHandlerEvents<T>[E],
    ): this {
        return super.once(event, listener);
    }
    public off<E extends keyof ConfigHandlerEvents<T>>(
        event: E,
        listener: ConfigHandlerEvents<T>[E],
    ): this {
        return super.off(event, listener);
    }
    public emit<E extends keyof ConfigHandlerEvents<T>>(
        event: E,
        ...args: Parameters<ConfigHandlerEvents<T>[E]>
    ): boolean {
        return super.emit(event, ...args);
    }
}
