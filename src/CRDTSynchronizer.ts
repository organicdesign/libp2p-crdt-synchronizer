import type { PubSub } from "@libp2p/interface-pubsub";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { Startable } from "@libp2p/interfaces/startable";
import type { CRDT, CRDTSynchronizer as ICRDTSynchronizer } from "./new-interfaces.js";
import {
	createMessageHandler,
	MessageHandler,
	MessageHandlerComponents,
	MessageHandlerOpts
} from "@organicdesign/libp2p-message-handler";
import { logger } from "@libp2p/logger";
import { Store } from "./Store.js";
import { isSync, isRequest } from "./protocol-helpers.js";
import { SyncMessage, MessageType } from "./CRDTSyncProtocol.js";

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
	pubsub?: PubSub
}

enum State {
	None,
	SelectCRDT,
	selectProtocol,
	Sync
}

interface StateData {
	state: State,
	crdt?: string,
	protocol?: string
	index?: number
}

export class CRDTSynchronizer implements Startable {
	private interval: ReturnType<typeof setInterval>;
	private readonly options: CRDTSynchronizerOpts;
	private readonly crdts = new Map<string, CRDT>();
	private readonly components: CRDTSynchronizerComponents;
	private readonly msgPromises = new Map<number, (value: SyncMessage) => void>();
	private readonly handler: MessageHandler;
	private readonly inState = new Store<StateData>();
	private readonly outState = new Store<StateData>();
	private started = false;

	private readonly genMsgId = (() => {
		let id = 0;

		return () => id++;
	})();

	get CRDTNames (): string[] {
		return [...this.crdts.keys()];
	}

	setCRDT (name: string, crdt: CRDT): void {
		this.crdts.set(name, crdt);
	}

	constructor(components: CRDTSynchronizerComponents, options: Partial<CRDTSynchronizerOpts> = {}) {
		this.options = {
			protocol: options.protocol ?? "/libp2p-crdt-synchronizer/0.0.1",
			interval: options.interval ?? 1000 * 60 * 2,
			autoSync: options.autoSync ?? true
		};

		this.components = components;

		this.handler = createMessageHandler(options)(components);

		this.handler.handle((message, peerId) => this.handleMessage(message, peerId));
	}

	async start (): Promise<void> {
		if (this.isStarted()) {
			return;
		}

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

			this.outState.set(peerId, { state: State.None });

			for (const [name, crdt] of this.crdts) {
				log.crdts("synchronizing crdt: %s", name);


				// Step 1: Select a CRDT
				const response = await this.request({
					type: MessageType.SELECT_CRDT,
					select: name
				}, peerId);

				if (!response.accept) {
					log.crdts("remote rejected crdt: %s", name);
					continue;
				}

				log.crdts("remote accepted crdt: %s", name);

				// Step 2: Select a Protocol
				let synchronizer: ICRDTSynchronizer | undefined;

				for (const protocol of crdt.getProtocols()) {
					const response = await this.request({
						type: MessageType.SELECT_PROTOCOL,
						select: protocol
					}, peerId);

					if (!response.accept) {
						log.crdts("remote rejected protocol: %s", protocol);
						continue;
					}

					log.crdts("remote accepted protocol: %s", protocol);

					synchronizer = crdt.getSynchronizer(protocol);
					break;
				}

				if (synchronizer == null) {
					log.crdts("no valid protocol found");
					continue;
				}

				// Step #3 synchronize
				const messageId = this.genMsgId();
				let sync = synchronizer.sync(undefined, { id: peerId.toBytes(), syncId: messageId });

				while (sync != null) {
					let response: SyncMessage;

					try {
						response = await this.request({
							type: MessageType.SYNC,
							sync: sync ?? new Uint8Array(),
							id: messageId
						}, peerId);
					} catch (error) {
						log.general.error("sync failed: %o", error);
						break;
					}

					// Remote does not have any data to provide.
					if (response.sync?.length === 0) {
						break;
					}

					sync = synchronizer.sync(response.sync, { id: peerId.toBytes(), syncId: messageId });
				}

				log.crdts("synchronized crdt: %s", name);
			}

			log.peers("synchronized to peer: %p", connection.remotePeer);
		}

		log.general("synchronized with connected peers");
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

	private async handleMessage (data: Uint8Array, peerId: PeerId): Promise<void> {
		const message = SyncMessage.decode(data);

		switch (message.type) {
			case MessageType.SELECT_RESPONSE:
			case MessageType.SYNC_RESPONSE:
				// Resolve promise.
				const resolver = this.msgPromises.get(message.id);

				this.msgPromises.delete(message.id);
				resolver?.(message);

				break;
			case MessageType.SYNC:
				await this.handleSync(message, peerId);
				break;
			case MessageType.SELECT_CRDT:
			case MessageType.SELECT_PROTOCOL:
				await this.handleSelect(message, peerId);
				break;
			default:
				log.general.error("recieved unknown message type: %s", message.type);
				throw new Error(`recieved unknown message type: ${message.type}`);
		}
	}

	private async handleSelect (message: SyncMessage, peerId: PeerId): Promise<void> {
		if (message.type === MessageType.SELECT_CRDT) {
			const hasCrdt = !!(message.select && this.crdts.has(message.select));

			// Update state.
			this.inState.set(peerId, {
				state: hasCrdt ? State.SelectCRDT : State.None,
				crdt: message.select
			});

			const response = SyncMessage.encode({
				type: MessageType.SELECT_RESPONSE,
				id: message.id,
				accept: hasCrdt
			});

			await this.handler.send(response, peerId);

			return;
		}

		if (message.type === MessageType.SELECT_PROTOCOL) {
			const crdtName = this.inState.get(peerId)?.crdt;

			if (crdtName == null || message.select == null) {
				log.general.error("state error");
				throw new Error("state error");
			}

			const crdt = this.crdts.get(crdtName);

			if (crdt == null) {
				log.general.error("state error");
				throw new Error("state error");
			}

			const hasSynchronizer = !!crdt.getSynchronizer(message.select);

			if (hasSynchronizer) {
				// Update state.
				this.inState.set(peerId, {
					state: State.Sync,
					crdt: crdtName,
					protocol: message.select
				});
			}

			log.general(`sending protocol request response: ${hasSynchronizer}`);

			const response = SyncMessage.encode({
				type: MessageType.SELECT_RESPONSE,
				id: message.id,
				accept: hasSynchronizer
			});

			await this.handler.send(response, peerId);

			return;
		}

		log.general.error("invalid message type: %s", message.type);
		throw new Error("invalid message");
	}

	private async handleSync (message: SyncMessage, peerId: PeerId): Promise<void> {
		if (!isSync(message)) {
			throw new Error("invalid message");
		}

		const data = message.sync;

		if (data == null) {
			throw new Error("invalid sync data");
		}

		const crdtName = this.inState.get(peerId)?.crdt;
		const protocol = this.inState.get(peerId)?.protocol;

		if (crdtName == null || protocol == null) {
			log.general.error("invalid state, %s, %s", crdtName, protocol);
			throw new Error("invalid state");
		}

		const crdt = this.crdts.get(crdtName);
		const synchronizer = crdt?.getSynchronizer(protocol);

		let response: Uint8Array = new Uint8Array();

		if (synchronizer != null && data.length !== 0) {
			response = synchronizer.sync(data, { id: peerId.toBytes(), syncId: message.id }) ?? new Uint8Array();
		}

		const newMessage = SyncMessage.encode({
			type: MessageType.SYNC_RESPONSE,
			sync: response,
			id: message.id
		});

		await this.handler.send(newMessage, peerId);
	}

	// Make a RPC style request to a peer.
	private async request (message: SyncMessage | Omit<SyncMessage, "id">, peerId: PeerId): Promise<SyncMessage> {
		const parsedMessage = message["id"] == null ? {...message, id: this.genMsgId() } : message as SyncMessage;

		if (!isRequest(parsedMessage)) {
			throw new Error(`invalid message type for request: ${parsedMessage.type}`)
		}
		await this.handler.send(SyncMessage.encode(parsedMessage), peerId);

		return await new Promise((resolve: (value: SyncMessage) => void) => {
			this.msgPromises.set(parsedMessage.id, resolve);
		});
	}
}

export const createCRDTSynchronizer = (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => new CRDTSynchronizer(components, options);
