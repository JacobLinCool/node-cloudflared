import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { bin } from "./constants.js";
import { Connection } from "./types.js";
import { ConnectionHandler, TryCloudflareHandler } from "./handler.js";

export type TunnelOptions = Record<string, string | number | boolean>;

export interface TunnelEvents {
    // Status events
    url: (url: string) => void;
    connected: (connection: Connection) => void;
    disconnected: (connection: Connection) => void;

    // Process events
    stdout: (data: string) => void;
    stderr: (data: string) => void;
    error: (error: Error) => void;
    exit: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export type OutputHandler = (output: string, tunnel: Tunnel) => void;

export class Tunnel extends EventEmitter {
    private _process: ChildProcess;
    private outputHandlers: OutputHandler[] = [];

    constructor(options: TunnelOptions | string[] = ["tunnel", "--hello-world"]) {
        super();
        this.setupDefaultHandlers();
        const args = Array.isArray(options) ? options : build_args(options);
        this._process = this.createProcess(args);
        this.setupEventHandlers();
    }

    public get process(): ChildProcess {
        return this._process;
    }

    private setupDefaultHandlers() {
        new ConnectionHandler(this);
        new TryCloudflareHandler(this);
    }

    /**
     * Add a custom output handler
     * @param handler Function to handle cloudflared output
     */
    public addHandler(handler: OutputHandler): void {
        this.outputHandlers.push(handler);
    }

    /**
     * Remove a previously added output handler
     * @param handler The handler to remove
     */
    public removeHandler(handler: OutputHandler): void {
        const index = this.outputHandlers.indexOf(handler);
        if (index !== -1) {
            this.outputHandlers.splice(index, 1);
        }
    }

    private processOutput(output: string): void {
        // Run all handlers on the output
        for (const handler of this.outputHandlers) {
            try {
                handler(output, this);
            } catch (error) {
                this.emit("error", error instanceof Error ? error : new Error(String(error)));
            }
        }
    }

    private setupEventHandlers() {
        // cloudflared outputs to stderr, but I think its better to listen to stdout too
        this.on("stdout", (output) => {
            this.processOutput(output);
        }).on("error", (err) => {
            this.emit("error", err);
        });

        this.on("stderr", (output) => {
            this.processOutput(output);
        }).on("error", (err) => {
            this.emit("error", err);
        });
    }

    private createProcess(args: string[]): ChildProcess {
        const child = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

        child.on("error", (error) => this.emit("error", error));
        child.on("exit", (code, signal) => this.emit("exit", code, signal));

        if (process.env.VERBOSE) {
            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);
        }

        child.stdout?.on("data", (data) => this.emit("stdout", data.toString()));
        child.stderr?.on("data", (data) => this.emit("stderr", data.toString()));

        return child;
    }

    public stop = this._stop.bind(this);
    private _stop(): boolean {
        return this.process.kill("SIGINT");
    }

    public on<E extends keyof TunnelEvents>(event: E, listener: TunnelEvents[E]): this {
        return super.on(event, listener);
    }
    public once<E extends keyof TunnelEvents>(event: E, listener: TunnelEvents[E]): this {
        return super.once(event, listener);
    }
    public off<E extends keyof TunnelEvents>(event: E, listener: TunnelEvents[E]): this {
        return super.off(event, listener);
    }
    public emit<E extends keyof TunnelEvents>(
        event: E,
        ...args: Parameters<TunnelEvents[E]>
    ): boolean {
        return super.emit(event, ...args);
    }

    /**
     * Create a quick tunnel without a Cloudflare account.
     * @param url The local service URL to connect to. If not provided, the hello world mode will be used.
     * @param options The options to pass to cloudflared.
     */
    public static quick(url?: string, options: TunnelOptions = {}): Tunnel {
        const args = ["tunnel"];
        if (url) {
            args.push("--url", url);
        } else {
            args.push("--hello-world");
        }
        args.push(...build_options(options));
        return new Tunnel(args);
    }

    /**
     * Create a tunnel with a Cloudflare account.
     * @param token The Cloudflare Tunnel token.
     * @param options The options to pass to cloudflared.
     */
    public static withToken(token: string, options: TunnelOptions = {}): Tunnel {
        options["--token"] = token;
        return new Tunnel(build_args(options));
    }
}

/**
 * Create a tunnel.
 * @param options The options to pass to cloudflared.
 * @returns A Tunnel instance
 */
export function tunnel(options: TunnelOptions = {}): Tunnel {
    return new Tunnel(options);
}

/**
 * Build the arguments for the cloudflared command.
 * @param options The options to pass to cloudflared.
 * @returns The arguments for the cloudflared command.
 */
export function build_args(options: TunnelOptions): string[] {
    const args: string[] = "--hello-world" in options ? ["tunnel"] : ["tunnel", "run"];
    args.push(...build_options(options));
    return args;
}

export function build_options(options: TunnelOptions): string[] {
    const opts: string[] = [];
    for (const [key, value] of Object.entries(options)) {
        if (typeof value === "string") {
            opts.push(`${key}`, value);
        } else if (typeof value === "number") {
            opts.push(`${key}`, value.toString());
        } else if (typeof value === "boolean") {
            if (value === true) {
                opts.push(`${key}`);
            }
        }
    }
    return opts;
}
