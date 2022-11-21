import type { CRDT, CRDTConfig } from "./interfaces.js";
interface TimestampedItem<T = unknown> {
    timestamp: number;
    value: T;
}
export declare class ForgetfulSet<T = unknown> implements CRDT {
    private data;
    private readonly timeout;
    constructor(_?: CRDTConfig, config?: {
        timeout?: number;
    });
    add(value: T): void;
    sync(data?: TimestampedItem<T>[]): TimestampedItem<T>[] | null;
    get value(): T[];
}
export {};
