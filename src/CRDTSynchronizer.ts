import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Connection, Stream } from "@libp2p/interface-connection";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import {
	createMessageHandler,
	MessageHandler,
	MessageHandlerComponents,
	MessageHandlerOpts
} from "@organicdesign/libp2p-message-handler";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { CRDTSyncMessage } from "./CRDTSyncProtocol.js";

export interface CRDTSynchronizerOpts extends MessageHandlerOpts {
	interval: number
	autoSync: boolean
}

export interface CRDTSynchronizerComponents extends MessageHandlerComponents {
	pubsub?: PubSub
}

export class CRDTSynchronizer {
	private interval: ReturnType<typeof setInterval>;
	private readonly options: CRDTSynchronizerOpts;
	private readonly crdts = new Map<string, CRDT>();
	private readonly components: CRDTSynchronizerComponents;
	private readonly writers = new Map<string, Pushable<Uint8Array>>();
	private readonly msgPromises = new Map<number, (value: CRDTSyncMessage) => void>();
	private readonly handler: MessageHandler;

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

	async start () {
		await this.handler.start();

		if (this.options.autoSync) {
			this.interval = setInterval(() => this.sync(), this.options.interval);
		}
	}

	async stop () {
		clearInterval(this.interval);

		await this.handler.stop();
	}

	async sync () {
		const connections = this.components.connectionManager.getConnections();

		for (const connection of connections) {
			for (const [name, crdt] of this.crdts) {
				const messageId = this.genMsgId();
				const peerId = connection.remotePeer;
				let sync = crdt.sync(undefined, { id: peerId.toBytes(), syncId: messageId });

				while (sync != null) {
					try {
						await this.handler.send(CRDTSyncMessage.encode({
							name,
							data: sync ?? new Uint8Array([]),
							id: messageId,
							request: true
						}), peerId);
					} catch (error) {
						console.warn(`sync failed for ${name}`);
						break;
					}

					const response = await new Promise((resolve: (value: CRDTSyncMessage) => void) => {
						this.msgPromises.set(messageId, resolve);
					});

					// Remote does not have any data to provide.
					if (response.data.length === 0) {
						break;
					}

					sync = crdt.sync(response.data, { id: peerId.toBytes(), syncId: messageId });
				}
			}
		}
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

	private async handleMessage (message: Uint8Array, peerId: PeerId): Promise<void> {
		const data = CRDTSyncMessage.decode(message);

		if (data.request === true) {
			await this.handleSync(data, peerId);
		} else {
			// Resolve promise.
			const resolver = this.msgPromises.get(data.id);

			this.msgPromises.delete(data.id);
			resolver?.(data);
		}
	}

	private async handleSync (message: CRDTSyncMessage, peerId: PeerId): Promise<void> {
		const crdt = this.crdts.get(message.name);
		let response: Uint8Array = new Uint8Array();

		if (crdt != null && message.data.length !== 0) {
			response = crdt.sync(message.data, { id: peerId.toBytes(), syncId: message.id }) ?? new Uint8Array();
		}

		const newMessage = CRDTSyncMessage.encode({
			name: message.name,
			data: response,
			id: message.id
		});

		await this.handler.send(newMessage, peerId);
	}
}

export const createCRDTSynchronizer = (options?: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => new CRDTSynchronizer(components, options);
