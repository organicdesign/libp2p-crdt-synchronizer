import type { CRDT, CRDTConfig } from "./interfaces.js";
interface TimestampedItem<T = unknown> {
    timestamp: number;
    value: T;
}
export declare class ForgetfulSet<T = unknown> implements CRDT {
    private readonly data;
    private readonly timeout;
    constructor(_?: CRDTConfig, config?: {
        timeout?: number;
    });
    add(value: T): void;
    sync(data?: TimestampedItem<T>[]): TimestampedItem<T>[] | null;
    get value(): TimestampedItem<T>[];
}
export {};
