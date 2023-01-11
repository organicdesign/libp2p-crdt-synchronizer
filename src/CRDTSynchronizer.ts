import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Connection, Stream } from "@libp2p/interface-connection";
import type { PeerId } from "@libp2p/interface-peer-id";
import type { CRDT } from "@organicdesign/crdt-interfaces";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { CRDTSyncMessage } from "./CRDTSyncProtocol.js";

export interface CRDTSynchronizerOpts {
	protocol: string
}

export interface CRDTSynchronizerComponents {
	connectionManager: ConnectionManager
	registrar: Registrar
	pubsub?: PubSub
}

export class CRDTSynchronizer {
	private readonly options: CRDTSynchronizerOpts;
	private readonly crdts = new Map<string, CRDT>();
	private readonly components: CRDTSynchronizerComponents;
	private readonly writers = new Map<string, Pushable<Uint8Array>>();
	private readonly msgPromises = new Map<number, (value: CRDTSyncMessage) => void>();

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
			protocol: options.protocol ?? "/libp2p-crdt-synchronizer/0.0.1"
		};

		this.components = components;
	}

	start () {
		this.components.registrar.handle(this.options.protocol, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});
	}

	async sync () {
		const connections = this.components.connectionManager.getConnections();

		for (const connection of connections) {
			// Only open a new stream if we don't already have on open.
			if (!this.writers.has(connection.remotePeer.toString())) {
				// This will throw if the node does not support this protocol
				const stream = await connection.newStream(this.options.protocol);

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
						data: sync ?? new Uint8Array([]),
						id: messageId,
						request: true
					}));

					const response = await new Promise((resolve: (value: CRDTSyncMessage) => void) => {
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
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

	private handleSync (message: CRDTSyncMessage, peerId: PeerId): Uint8Array {
		const crdt = this.crdts.get(message.name);
		let response: Uint8Array = new Uint8Array();

		if (crdt != null && message.data.length !== 0) {
			response = crdt.sync(message.data, { id: peerId.toBytes(), syncId: message.id }) ?? new Uint8Array();
		}

		return CRDTSyncMessage.encode({
			name: message.name,
			data: response,
			id: message.id
		});
	}

	private handleStream (stream: Stream, connection: Connection) {
		const that = this;
		const peerId = connection.remotePeer.toString();

		// Handle inputs.
		pipe(stream, lp.decode(), async function (source) {
			for await (const message of source) {
				const data = CRDTSyncMessage.decode(message);

				if (data.request === true) {
					const response = that.handleSync(data, connection.remotePeer);
					const writer = that.writers.get(peerId.toString());

					writer?.push(response);
				} else {
					const resolver = that.msgPromises.get(data.id);

					that.msgPromises.delete(data.id);
					resolver?.(data);
				}
			}
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
		(async () => {
			try {
				await pipe(writer, lp.encode(), stream);
			} finally {
				this.writers.delete(peerId);
			}
		})();
	}
}

export const createCRDTSynchronizer = (options: Partial<CRDTSynchronizerOpts>) => (components: CRDTSynchronizerComponents) => new CRDTSynchronizer(components, options);
