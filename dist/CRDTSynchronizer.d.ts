import type { PubSub } from "@libp2p/interface-pubsub";
import type { Startable } from "@libp2p/interfaces/startable";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import { MessageHandlerComponents, MessageHandlerOpts } from "@organicdesign/libp2p-message-handler";
export interface CRDTSynchronizerOpts extends MessageHandlerOpts {
    interval: number;
    autoSync: boolean;
}
export interface CRDTSynchronizerComponents extends MessageHandlerComponents {
    pubsub?: PubSub;
}
export declare class CRDTSynchronizer implements Startable {
    private interval;
    private readonly options;
    private readonly crdts;
    private readonly components;
    private readonly msgPromises;
    private readonly handler;
    private started;
    private readonly genMsgId;
    get CRDTNames(): string[];
    setCRDT(name: string, crdt: CRDT): void;
    constructor(components: CRDTSynchronizerComponents, options?: Partial<CRDTSynchronizerOpts>);
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    sync(): Promise<void>;
    getCRDT(name: string): CRDT | undefined;
    private handleMessage;
    private handleSync;
}
export declare const createCRDTSynchronizer: (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => CRDTSynchronizer;
