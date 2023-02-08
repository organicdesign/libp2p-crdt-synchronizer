var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { createMessageHandler } from "@organicdesign/libp2p-message-handler";
import { logger } from "@libp2p/logger";
import { createCRDTMapSynchronizer } from "@organicdesign/crdt-map-synchronizer";
import { SyncMessage } from "./CRDTSyncProtocol.js";
const log = {
    general: logger("libp2p:crdt-synchronizer"),
    peers: logger("libp2p:crdt-synchronizer:peers"),
    crdts: logger("libp2p:crdt-synchronizer:crdts")
};
export class CRDTSynchronizer {
    keys() {
        return this.crdts.keys();
    }
    set(name, crdt) {
        this.crdts.set(name, crdt);
    }
    constructor(components, options = {}) {
        var _a, _b, _c;
        this.crdts = new Map();
        this.msgPromises = new Map();
        this.started = false;
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
        this.handler = createMessageHandler(options)(components);
        this.handler.handle((message, peerId) => this.handleMessage(message, peerId));
        this.synchronizer = createCRDTMapSynchronizer()({
            getId: () => this.components.peerId.toBytes(),
            keys: () => this.keys(),
            get: (key) => this.crdts.get(key)
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isStarted()) {
                return;
            }
            yield this.handler.start();
            if (this.options.autoSync) {
                this.interval = setInterval(() => this.sync(), this.options.interval);
            }
            this.started = true;
            log.general("started");
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isStarted()) {
                return;
            }
            clearInterval(this.interval);
            yield this.handler.stop();
            this.started = false;
            log.general("stopped");
        });
    }
    isStarted() {
        return this.started;
    }
    sync() {
        return __awaiter(this, void 0, void 0, function* () {
            log.general("synchronizing with connected peers");
            const connections = this.components.getConnections();
            for (const connection of connections) {
                const peerId = connection.remotePeer;
                log.peers("synchronizing to peer: %p", peerId);
                let syncData = this.synchronizer.sync(undefined, { id: peerId.toBytes(), syncId: 0 });
                for (let i = 0; i < 100; i++) {
                    if (syncData == null) {
                        break;
                    }
                    const response = yield this.request(syncData, peerId);
                    if (response.length === 0) {
                        break;
                    }
                    syncData = this.synchronizer.sync(response, { id: peerId.toBytes(), syncId: 0 });
                }
                log.peers("synchronized to peer: %p", connection.remotePeer);
            }
            log.general("synchronized with connected peers");
        });
    }
    get(name) {
        return this.crdts.get(name);
    }
    handleMessage(data, peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const message = SyncMessage.decode(data);
            if (message.request === true) {
                const response = this.synchronizer.sync(message.data, { id: peerId.toBytes(), syncId: message.id });
                yield this.handler.send(SyncMessage.encode({
                    data: response !== null && response !== void 0 ? response : new Uint8Array(),
                    id: message.id
                }), peerId);
                return;
            }
            const resolver = this.msgPromises.get(message.id);
            this.msgPromises.delete(message.id);
            resolver === null || resolver === void 0 ? void 0 : resolver(message.data);
        });
    }
    // Make a RPC style request to a peer.
    request(data, peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = this.genMsgId();
            const promise = new Promise((resolve) => {
                this.msgPromises.set(id, resolve);
            });
            yield this.handler.send(SyncMessage.encode({
                request: true,
                data,
                id
            }), peerId);
            return yield promise;
        });
    }
}
export const createCRDTSynchronizer = (options) => (components) => new CRDTSynchronizer(components, options);
