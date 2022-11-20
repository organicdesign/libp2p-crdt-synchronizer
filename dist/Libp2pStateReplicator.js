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
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import { GSet } from "./GSet.js";
import { LWWRegister } from "./LWWRegister.js";
import { Counter } from "./Counter.js";
import { TwoPSet } from "./TwoPSet.js";
import { CRDTMap } from "./CRDTMap.js";
import { LWWMap } from "./LWWMap.js";
import { Table } from "./Table.js";
const PROTOCOL = "/libp2p-state-replication/0.0.1";
export class Libp2pStateReplicator {
    constructor({ libp2p }) {
        this.crdtConstrucotrs = new Map();
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
        this.node = libp2p;
        // Types will not replicate if you do not handle.
        this.handle("/register/lww", () => new LWWRegister());
        this.handle("/counter/pn", () => new Counter());
        this.handle("/set/g", () => new GSet());
        this.handle("/set/2p", () => new TwoPSet());
        this.handle("/map/crdt", (c) => new CRDTMap(c));
        this.handle("/map/lww", () => new LWWMap());
        this.handle("/map/table", (c) => new Table(c));
        this.root = this.createCRDT("/map/crdt");
    }
    get data() {
        return this.root;
    }
    get CRDTNames() {
        return [...this.root.keys()];
    }
    get createCRDT() {
        return (protocol) => {
            const crdtConstuctor = this.crdtConstrucotrs.get(protocol);
            if (crdtConstuctor == null) {
                throw new Error(`missing constructor for protocol: ${protocol}`);
            }
            return crdtConstuctor();
        };
    }
    start() {
        this.node.handle(PROTOCOL, ({ stream, connection }) => __awaiter(this, void 0, void 0, function* () {
            this.handleStream(stream, connection);
        }));
        this.rpc.addMethod("syncCRDT", ({ data }) => __awaiter(this, void 0, void 0, function* () {
            return this.root.sync(data);
        }));
    }
    requestBlocks() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.node.connectionManager.getConnections();
            for (const connection of connections) {
                // Only open a new stream if we don't already have on open.
                if (!this.writers.has(connection.remotePeer.toString())) {
                    // This will throw if the node does not support this protocol
                    const stream = yield connection.newStream(PROTOCOL);
                    this.handleStream(stream, connection);
                }
                let sync = this.root.sync();
                while (sync != null) {
                    const data = yield this.rpc.request("syncCRDT", { data: sync }, connection.remotePeer.toString());
                    // Remote does not have any data to provide.
                    if (data == null) {
                        break;
                    }
                    sync = this.root.sync(data);
                }
            }
        });
    }
    getCRDT(name) {
        return this.root.get(name);
    }
    handle(protocol, crdtConstuctor) {
        this.crdtConstrucotrs.set(protocol, () => crdtConstuctor({
            resolver: this.createCRDT,
            id: this.node.peerId.toString(),
            protocol
        }));
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
