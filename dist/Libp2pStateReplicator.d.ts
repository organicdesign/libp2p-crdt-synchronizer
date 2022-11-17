import type { Libp2p } from "libp2p";
import { CRDTMap } from "./CRDTMap.js";
import type { CRDT, CRDTConfig, CRDTResolver } from "./interfaces";
export declare class Libp2pStateReplicator {
    private readonly root;
    private readonly crdtConstrucotrs;
    private readonly node;
    private readonly writers;
    private readonly rpc;
    get data(): CRDTMap;
    get CRDTNames(): string[];
    get createCRDT(): CRDTResolver;
    constructor({ libp2p }: {
        libp2p: Libp2p;
    });
    start(): void;
    requestBlocks(): Promise<void>;
    getCRDT(name: string): CRDT | undefined;
    handle(protocol: string, crdtConstuctor: (config?: CRDTConfig) => CRDT): void;
    private handleStream;
}
