import type { CRDT, CRDTConfig } from "./interfaces.js";
export declare class Table implements CRDT {
    private readonly rows;
    private readonly resolver;
    constructor({ resolver }: CRDTConfig);
    get value(): {
        id: string;
    }[];
    create(id: string, data: {
        [key: string]: unknown;
    }): void;
    sync(data?: any): {
        [key: string]: {
            sync: unknown;
            protocol: string;
        };
    } | undefined;
}
