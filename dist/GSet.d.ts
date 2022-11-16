import type { CRDT } from "./interfaces.js";
export declare class GSet<T = unknown> implements CRDT, Iterable<T> {
    private added;
    add(item: T): void;
    sync(data?: T[]): T[] | null;
    get value(): T[];
    [Symbol.iterator](): IterableIterator<T>;
}
