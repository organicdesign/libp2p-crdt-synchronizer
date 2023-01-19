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
import { CRDTSyncMessage } from "./CRDTSyncProtocol.js";
const log = {
    general: logger("libp2p:crdt-synchronizer"),
    peers: logger("libp2p:crdt-synchronizer:peers"),
    crdts: logger("libp2p:crdt-synchronizer:crdts")
};
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
                log.peers("synchronizing to peer: %p", connection.remotePeer);
                for (const [name, crdt] of this.crdts) {
                    log.crdts("synchronizing crdt: %s", name);
                    const messageId = this.genMsgId();
                    const peerId = connection.remotePeer;
                    let sync = crdt.sync(undefined, { id: peerId.toBytes(), syncId: messageId });
                    while (sync != null) {
                        try {
                            yield this.handler.send(CRDTSyncMessage.encode({
                                name,
                                data: sync !== null && sync !== void 0 ? sync : new Uint8Array([]),
                                id: messageId,
                                request: true
                            }), peerId);
                        }
                        catch (error) {
                            log.general.error("sync failed: %o", error);
                            break;
                        }
                        const response = yield new Promise((resolve) => {
                            this.msgPromises.set(messageId, resolve);
                        });
                        // Remote does not have any data to provide.
                        if (response.data.length === 0) {
                            break;
                        }
                        sync = crdt.sync(response.data, { id: peerId.toBytes(), syncId: messageId });
                    }
                    log.crdts("synchronized crdt: %s", name);
                }
                log.peers("synchronized to peer: %p", connection.remotePeer);
            }
            log.general("synchronized with connected peers");
        });
    }
    getCRDT(name) {
        return this.crdts.get(name);
    }
    handleMessage(message, peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = CRDTSyncMessage.decode(message);
            if (data.request === true) {
                yield this.handleSync(data, peerId);
            }
            else {
                // Resolve promise.
                const resolver = this.msgPromises.get(data.id);
                this.msgPromises.delete(data.id);
                resolver === null || resolver === void 0 ? void 0 : resolver(data);
            }
        });
    }
    handleSync(message, peerId) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const crdt = this.crdts.get(message.name);
            let response = new Uint8Array();
            if (crdt != null && message.data.length !== 0) {
                response = (_a = crdt.sync(message.data, { id: peerId.toBytes(), syncId: message.id })) !== null && _a !== void 0 ? _a : new Uint8Array();
            }
            const newMessage = CRDTSyncMessage.encode({
                name: message.name,
                data: response,
                id: message.id
            });
            yield this.handler.send(newMessage, peerId);
        });
    }
}
export const createCRDTSynchronizer = (options) => (components) => new CRDTSynchronizer(components, options);
