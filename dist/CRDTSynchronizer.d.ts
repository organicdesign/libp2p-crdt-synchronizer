import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { CRDT } from "@organicdesign/crdt-interfaces";
export interface CRDTSynchronizerOpts {
    protocol: string;
    interval: number;
    autoSync: boolean;
}
export interface CRDTSynchronizerComponents {
    connectionManager: ConnectionManager;
    registrar: Registrar;
    pubsub?: PubSub;
}
export declare class CRDTSynchronizer {
    private interval;
    private readonly options;
    private readonly crdts;
    private readonly components;
    private readonly writers;
    private readonly msgPromises;
    private readonly genMsgId;
    get CRDTNames(): string[];
    setCRDT(name: string, crdt: CRDT): void;
    constructor(components: CRDTSynchronizerComponents, options?: Partial<CRDTSynchronizerOpts>);
    start(): void;
    stop(): Promise<void>;
    sync(): Promise<void>;
    getCRDT(name: string): CRDT | undefined;
    private handleSync;
    private handleStream;
}
export declare const createCRDTSynchronizer: (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => CRDTSynchronizer;
