var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { JSONRPCServerAndClient, JSONRPCClient, JSONRPCServer } from "json-rpc-2.0";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
const PROTOCOL = "/libp2p-state-replication/0.0.1";
export class StateReplicator {
    constructor(node) {
        this.dss = new DistributedStateSynchronizer();
        this.writers = new Map();
        this.rpc = new JSONRPCServerAndClient(new JSONRPCServer(), new JSONRPCClient((request, peerId) => __awaiter(this, void 0, void 0, function* () {
            if (peerId == null) {
                throw new Error("peer Id must be specified");
            }
            const writer = this.writers.get(peerId);
            if (!writer) {
                console.warn("not connected");
                return;
            }
            const asUint8Array = uint8ArrayFromString(JSON.stringify(request));
            writer.push(asUint8Array);
        })));
        node.handle(PROTOCOL, ({ stream, connection }) => __awaiter(this, void 0, void 0, function* () {
            this.handleStream(stream, connection);
        }));
        this.rpc.addMethod("getBlocks", (data) => __awaiter(this, void 0, void 0, function* () {
            let blocks = [];
            for (const peerId of Object.keys(data)) {
                const timestamp = data[peerId];
                const newBlocks = yield this.dss.getBlocks(peerId, timestamp);
                blocks = [...blocks, ...newBlocks];
            }
            return blocks;
        }));
        this.rpc.addMethod("getTips", (data) => __awaiter(this, void 0, void 0, function* () {
            return yield this.dss.filterTips(new Uint8Array(data.filter));
        }));
        this.node = node;
    }
    requestBlocks() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.node.connectionManager.getConnections();
            for (const connection of connections) {
                // This will throw if the node does not support this protocol
                if (!this.writers.has(connection.remotePeer.toString())) {
                    const stream = yield connection.newStream(PROTOCOL);
                    this.handleStream(stream, connection);
                }
                const filter = yield this.dss.generateFilter();
                const remoteTips = yield this.rpc.request("getTips", { filter: Array.from(filter) }, connection.remotePeer.toString());
                const tips = yield this.dss.getTipDifference(remoteTips);
                const blocks = yield this.rpc.request("getBlocks", tips, connection.remotePeer.toString());
                yield this.dss.putBlocks(blocks);
            }
        });
    }
    handleStream(stream, connection) {
        const that = this;
        const peerId = connection.remotePeer.toString();
        // Handle inputs.
        pipe(stream, lp.decode(), function (source) {
            var source_1, source_1_1;
            var e_1, _a;
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    for (source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), !source_1_1.done;) {
                        const message = source_1_1.value;
                        const data = JSON.parse(uint8ArrayToString(message.subarray()));
                        yield that.rpc.receiveAndSend(data, peerId, peerId);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (source_1_1 && !source_1_1.done && (_a = source_1.return)) yield _a.call(source_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            });
        }).catch(() => {
            // Do nothing
        });
        // Don't pipe events through the same connection
        if (this.writers.has(peerId)) {
            return;
        }
        const writer = pushable();
        this.writers.set(peerId, writer);
        // Handle outputs.
        (() => __awaiter(this, void 0, void 0, function* () {
            try {
                yield pipe(writer, lp.encode(), stream);
            }
            finally {
                this.writers.delete(peerId);
            }
        }))();
    }
}
