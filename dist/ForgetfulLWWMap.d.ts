import { CRDT, CRDTConfig } from "./interfaces.js";
export declare class ForgetfulLWWMap implements CRDT {
    private data;
    private timestamps;
    private readonly timeout;
    constructor(_?: CRDTConfig, config?: {
        timeout?: number;
    });
    get value(): {
        [x: string]: unknown;
    };
    set(key: string, data: unknown): void;
    get(key: string): unknown;
    sync(data?: any): {
        data: {
            [key: string]: unknown;
        };
        timestamps: {
            [key: string]: number;
        };
    } | undefined;
}
