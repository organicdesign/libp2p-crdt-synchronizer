import { JSONRPCServerAndClient } from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import type { Connection, Stream } from "@libp2p/interface-connection";
export declare class StateReplicator {
    private node;
    dss: DistributedStateSynchronizer;
    private writers;
    rpc: JSONRPCServerAndClient<string, string>;
    constructor(node: Libp2p);
    requestBlocks(): Promise<void>;
    handleStream(stream: Stream, connection: Connection): void;
}
