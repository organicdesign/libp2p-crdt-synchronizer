import type { CRDT } from "./interfaces.js";
export interface Serialized2PSet<T> {
    added: T[];
    removed: T[];
}
export declare class TwoPSet<T = unknown> implements CRDT {
    private added;
    private removed;
    remove(item: T): void;
    add(item: T): void;
    sync(data?: Serialized2PSet<T>): {
        added: T[];
        removed: T[];
    } | undefined;
    get value(): T[];
}
