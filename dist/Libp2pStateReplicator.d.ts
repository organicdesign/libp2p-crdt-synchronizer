import type { Libp2p } from "libp2p";
import { CRDTMap } from "./CRDTMap.js";
import type { CRDT, CRDTConfig, CRDTResolver } from "./interfaces";
export declare class Libp2pStateReplicator {
    private readonly root;
    private readonly crdtConstrucotrs;
    private readonly writers;
    private node;
    private readonly rpc;
    get data(): CRDTMap;
    get CRDTNames(): string[];
    get createCRDT(): CRDTResolver;
    constructor();
    start(libp2p: Libp2p): void;
    requestBlocks(): Promise<void>;
    getCRDT(name: string): CRDT | undefined;
    handle(protocol: string, crdtConstuctor: (config?: CRDTConfig) => CRDT): void;
    private handleStream;
}
