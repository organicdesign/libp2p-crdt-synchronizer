import type { PubSub } from "@libp2p/interface-pubsub";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Startable } from "@libp2p/interfaces/startable";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import {
	createMessageHandler,
	MessageHandler,
	MessageHandlerComponents,
	MessageHandlerOpts
} from "@organicdesign/libp2p-message-handler";
import { logger } from "@libp2p/logger";
import { CRDTMapSynchronizer, createCRDTMapSynchronizer } from "@organicdesign/crdt-map-synchronizer";
import { SyncMessage } from "./CRDTSyncProtocol.js";

const log = {
	general: logger("libp2p:crdt-synchronizer"),
	peers: logger("libp2p:crdt-synchronizer:peers"),
	crdts: logger("libp2p:crdt-synchronizer:crdts")
};

export interface CRDTSynchronizerOpts extends MessageHandlerOpts {
	interval: number
	autoSync: boolean
}

export interface CRDTSynchronizerComponents extends MessageHandlerComponents {
	peerId: PeerId
	pubsub?: PubSub
}

export class CRDTSynchronizer implements Startable {
	private interval: ReturnType<typeof setInterval>;
	private readonly options: CRDTSynchronizerOpts;
	private readonly crdts = new Map<string, CRDT>();
	private readonly components: CRDTSynchronizerComponents;
	private readonly msgPromises = new Map<number, (value: Uint8Array) => void>();
	private handler: MessageHandler;
	private synchronizer: CRDTMapSynchronizer;
	private started = false;

	private readonly genMsgId = (() => {
		let id = 0;

		return () => id++;
	})();

	keys (): Iterable<string> {
		return this.crdts.keys();
	}

	set (name: string, crdt: CRDT): void {
		this.crdts.set(name, crdt);
	}

	constructor(components: CRDTSynchronizerComponents, options: Partial<CRDTSynchronizerOpts> = {}) {
		this.options = {
			protocol: options.protocol ?? "/libp2p-crdt-synchronizer/0.0.1",
			interval: options.interval ?? 1000 * 60 * 2,
			autoSync: options.autoSync ?? true
		};

		this.components = components;
	}

	async start (): Promise<void> {
		if (this.isStarted()) {
			return;
		}

		this.handler = createMessageHandler({})(this.components);

		this.handler.handle((message, peerId) => this.handleMessage(message, peerId));

		this.synchronizer = createCRDTMapSynchronizer()({
			getId: () => this.components.peerId.toBytes(),
			keys: () => this.keys(),
			get: (key: string) => this.crdts.get(key)
		});

		await this.handler.start();

		if (this.options.autoSync) {
			this.interval = setInterval(() => this.sync(), this.options.interval);
		}

		this.started = true;

		log.general("started");
	}

	async stop (): Promise<void> {
		if (!this.isStarted()) {
			return;
		}

		clearInterval(this.interval);

		await this.handler.stop();

		this.started = false;

		log.general("stopped");
	}

	isStarted (): boolean {
		return this.started;
	}

	async sync (): Promise<void> {
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

				const response = await this.request(syncData, peerId);

				if (response.length === 0) {
					break;
				}

				syncData = this.synchronizer.sync(response, { id: peerId.toBytes(), syncId: 0 });
			}
			log.peers("synchronized to peer: %p", connection.remotePeer);
		}

		log.general("synchronized with connected peers");
	}

	get (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

	private async handleMessage (data: Uint8Array, peerId: PeerId): Promise<void> {
		const message = SyncMessage.decode(data);

		if (message.request === true) {
			const response = this.synchronizer.sync(message.data, { id: peerId.toBytes(), syncId: message.id });

			await this.handler.send(SyncMessage.encode({
				data: response ?? new Uint8Array(),
				id: message.id
			}), peerId);
			return;
		}

		const resolver = this.msgPromises.get(message.id);

		this.msgPromises.delete(message.id);
		resolver?.(message.data);
	}

	// Make a RPC style request to a peer.
	private async request (data: Uint8Array, peerId: PeerId): Promise<Uint8Array> {
		const id = this.genMsgId();

		const promise = new Promise((resolve: (value: Uint8Array) => void) => {
			this.msgPromises.set(id, resolve);
		});

		await this.handler.send(SyncMessage.encode({
			request: true,
			data,
			id
		}), peerId);

		return await promise;
	}
}

export const createCRDTSynchronizer = (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => new CRDTSynchronizer(components, options);
