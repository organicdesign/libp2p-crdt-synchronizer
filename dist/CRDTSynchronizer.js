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
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable } from "it-pushable";
import { CRDTSyncMessage } from "./CRDTSyncProtocol.js";
export class CRDTSynchronizer {
    get CRDTNames() {
        return [...this.crdts.keys()];
    }
    setCRDT(name, crdt) {
        this.crdts.set(name, crdt);
    }
    constructor(components, options = {}) {
        var _a, _b, _c;
        this.crdts = new Map();
        this.writers = new Map();
        this.msgPromises = new Map();
        this.genMsgId = (() => {
            let id = 0;
            return () => id++;
        })();
        this.options = {
            protocol: (_a = options.protocol) !== null && _a !== void 0 ? _a : "/libp2p-crdt-synchronizer/0.0.1",
            interval: (_b = options.interval) !== null && _b !== void 0 ? _b : 1000 * 60 * 2,
            autoSync: (_c = options.autoSync) !== null && _c !== void 0 ? _c : true
        };
        this.components = components;
    }
    start() {
        this.components.registrar.handle(this.options.protocol, ({ stream, connection }) => __awaiter(this, void 0, void 0, function* () {
            this.handleStream(stream, connection);
        }));
        if (this.options.autoSync) {
            this.interval = setInterval(() => this.sync(), this.options.interval);
        }
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            clearInterval(this.interval);
            yield this.components.registrar.unhandle(this.options.protocol);
        });
    }
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            const connections = this.components.connectionManager.getConnections();
            for (const connection of connections) {
                // Only open a new stream if we don't already have on open.
                if (!this.writers.has(connection.remotePeer.toString())) {
                    // This will throw if the node does not support this protocol
                    const stream = yield connection.newStream(this.options.protocol);
                    this.handleStream(stream, connection);
                }
                const writer = this.writers.get(connection.remotePeer.toString());
                if (writer == null) {
                    console.warn("not connected");
                    continue;
                }
                for (const [name, crdt] of this.crdts) {
                    const messageId = this.genMsgId();
                    const peerId = connection.remotePeer.toBytes();
                    let sync = crdt.sync(undefined, { id: peerId, syncId: messageId });
                    while (sync != null) {
                        writer.push(CRDTSyncMessage.encode({
                            name,
                            data: sync !== null && sync !== void 0 ? sync : new Uint8Array([]),
                            id: messageId,
                            request: true
                        }));
                        const response = yield new Promise((resolve) => {
                            this.msgPromises.set(messageId, resolve);
                        });
                        // Remote does not have any data to provide.
                        if (response.data.length === 0) {
                            break;
                        }
                        sync = crdt.sync(response.data, { id: peerId, syncId: messageId });
                    }
                }
            }
        });
    }
    getCRDT(name) {
        return this.crdts.get(name);
    }
    handleSync(message, peerId) {
        var _a;
        const crdt = this.crdts.get(message.name);
        let response = new Uint8Array();
        if (crdt != null && message.data.length !== 0) {
            response = (_a = crdt.sync(message.data, { id: peerId.toBytes(), syncId: message.id })) !== null && _a !== void 0 ? _a : new Uint8Array();
        }
        return CRDTSyncMessage.encode({
            name: message.name,
            data: response,
            id: message.id
        });
    }
    handleStream(stream, connection) {
        const that = this;
        const peerId = connection.remotePeer.toString();
        // Handle inputs.
        pipe(stream, lp.decode(), function (source) {
            var _a, source_1, source_1_1;
            var _b, e_1, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    for (_a = true, source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), _b = source_1_1.done, !_b;) {
                        _d = source_1_1.value;
                        _a = false;
                        try {
                            const message = _d;
                            const data = CRDTSyncMessage.decode(message);
                            if (data.request === true) {
                                const response = that.handleSync(data, connection.remotePeer);
                                const writer = that.writers.get(peerId.toString());
                                writer === null || writer === void 0 ? void 0 : writer.push(response);
                            }
                            else {
                                const resolver = that.msgPromises.get(data.id);
                                that.msgPromises.delete(data.id);
                                resolver === null || resolver === void 0 ? void 0 : resolver(data);
                            }
                        }
                        finally {
                            _a = true;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = source_1.return)) yield _c.call(source_1);
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
export const createCRDTSynchronizer = (options) => (components) => new CRDTSynchronizer(components, options);
