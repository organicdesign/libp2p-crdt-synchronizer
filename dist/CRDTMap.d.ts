import { CRDT, CRDTConfig } from "./interfaces.js";
export declare class CRDTMap implements CRDT {
    private data;
    private readonly resolver;
    constructor({ resolver }: CRDTConfig);
    get value(): {};
    set(key: string, value: CRDT, protocol: string): void;
    get(key: string): CRDT;
    keys(): string[];
    sync(data?: {
        [key: string]: {
            sync: unknown;
            protocol: string;
        };
    }): {
        [key: string]: {
            sync: unknown;
            protocol: string;
        };
    } | undefined;
}
