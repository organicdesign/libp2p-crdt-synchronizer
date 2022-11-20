import { CRDT } from "./interfaces.js";
export declare class LWWRegister implements CRDT {
    private data;
    private timestamp;
    get value(): unknown;
    set(key: string, data: unknown): void;
    get(): unknown;
    sync(data?: any): {
        data: unknown;
        timestamp: string;
    } | undefined;
}
