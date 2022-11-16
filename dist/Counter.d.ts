import type { CRDT } from "./interfaces.js";
interface Operation {
    value: number;
    id: number;
}
export declare class Counter implements CRDT {
    private cachedValue;
    private operations;
    private ids;
    get value(): number;
    increment(value: number): void;
    decrement(value: number): void;
    sync(operations?: Operation[]): Operation[] | undefined;
}
export {};
