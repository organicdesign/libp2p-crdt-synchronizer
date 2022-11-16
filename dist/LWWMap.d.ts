import { CRDT } from "./interfaces.js";
export declare class LWWMap implements CRDT {
    private data;
    private timestamps;
    get value(): {
        [x: string]: unknown;
    };
    set(key: string, data: unknown): void;
    sync(data?: any): {
        data: {
            [key: string]: unknown;
        };
        timestamps: {
            [key: string]: string;
        };
    } | undefined;
}
