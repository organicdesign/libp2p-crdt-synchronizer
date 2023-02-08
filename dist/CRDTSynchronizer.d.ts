import type { PubSub } from "@libp2p/interface-pubsub";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Startable } from "@libp2p/interfaces/startable";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import { MessageHandlerComponents, MessageHandlerOpts } from "@organicdesign/libp2p-message-handler";
export interface CRDTSynchronizerOpts extends MessageHandlerOpts {
    interval: number;
    autoSync: boolean;
}
export interface CRDTSynchronizerComponents extends MessageHandlerComponents {
    peerId: PeerId;
    pubsub?: PubSub;
}
export declare class CRDTSynchronizer implements Startable {
    private interval;
    private readonly options;
    private readonly crdts;
    private readonly components;
    private readonly msgPromises;
    private readonly handler;
    private readonly synchronizer;
    private started;
    private readonly genMsgId;
    keys(): Iterable<string>;
    set(name: string, crdt: CRDT): void;
    constructor(components: CRDTSynchronizerComponents, options?: Partial<CRDTSynchronizerOpts>);
    start(): Promise<void>;
    stop(): Promise<void>;
    isStarted(): boolean;
    sync(): Promise<void>;
    get(name: string): CRDT | undefined;
    private handleMessage;
    private request;
}
export declare const createCRDTSynchronizer: (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => CRDTSynchronizer;
