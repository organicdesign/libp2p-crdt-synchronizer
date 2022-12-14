import type { ConnectionManager } from "@libp2p/interface-connection-manager";
import type { Registrar } from "@libp2p/interface-registrar";
import type { PubSub } from "@libp2p/interface-pubsub";
import type { Connection, Stream } from "@libp2p/interface-connection";
import type { CRDT } from "crdt-interfaces";
import { JSONRPCServerAndClient, JSONRPCClient, JSONRPCServer } from "json-rpc-2.0";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

export interface Libp2pStateReplicatorOpts {
	protocol: string
}

export interface Libp2pStateReplicatorComponents {
	connectionManager: ConnectionManager
	registrar: Registrar,
	pubsub?: PubSub
}

export class Libp2pStateReplicator {
	private readonly options: Libp2pStateReplicatorOpts;
	private readonly crdts = new Map<string, CRDT>();
	private readonly components: Libp2pStateReplicatorComponents;
	private readonly writers = new Map<string, Pushable<Uint8Array>>();

	private readonly rpc = new JSONRPCServerAndClient<string, string>(
		new JSONRPCServer(),
		new JSONRPCClient(async (request: object, peerId: string) => {
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
		})
	);

	get CRDTNames (): string[] {
		return [...this.crdts.keys()];
	}

	setCRDT (name: string, crdt: CRDT): void {
		this.crdts.set(name, crdt);
	}

	constructor(components: Libp2pStateReplicatorComponents, options: Partial<Libp2pStateReplicatorOpts> = {}) {
		this.options = {
			protocol: options.protocol ?? "/libp2p-state-replication/0.0.1"
		};

		this.components = components;
	}

	start () {
		this.components.registrar.handle(this.options.protocol, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.rpc.addMethod("syncCRDT", async ({ name, data }: { name: string, data: string }) => {
			const crdt = this.crdts.get(name);

			if (crdt == null) {
				return;
			}

			const decodedData = uint8ArrayFromString(data, "ascii");


			const response = crdt.sync(decodedData, { id: new Uint8Array([1]) });

			if (!response) {
				return;
			}

			return uint8ArrayToString(response, "ascii");
		});
	}

	async requestBlocks () {
		const connections = this.components.connectionManager.getConnections();

		for (const connection of connections) {
			// Only open a new stream if we don't already have on open.
			if (!this.writers.has(connection.remotePeer.toString())) {
				// This will throw if the node does not support this protocol
				const stream = await connection.newStream(this.options.protocol);

				this.handleStream(stream, connection);
			}

			for (const [name, crdt] of this.crdts) {
				let sync = crdt.sync(undefined, { id: new Uint8Array([1]) });

				while (sync != null) {
					const raw: string | undefined = await this.rpc.request(
						"syncCRDT",
						{ name, data: uint8ArrayToString(sync, "ascii") },
						connection.remotePeer.toString()
					);

					// Remote does not have any data to provide.
					if (raw == null) {
						break;
					}

					const data = uint8ArrayFromString(raw, "ascii");

					sync = crdt.sync(data, { id: new Uint8Array([1]) });
				}
			}
		}
	}

	getCRDT (name: string): CRDT | undefined {
		return this.crdts.get(name);
	}

	private handleStream (stream: Stream, connection: Connection) {
		const that = this;
		const peerId = connection.remotePeer.toString();

		// Handle inputs.
		pipe(stream, lp.decode(), async function (source) {
			for await (const message of source) {
				const data = JSON.parse(uint8ArrayToString(message.subarray()));
				await that.rpc.receiveAndSend(data, peerId, peerId);
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

export const createLibp2pStateReplicator = (options: Partial<Libp2pStateReplicatorOpts>) => (components: Libp2pStateReplicatorComponents) => new Libp2pStateReplicator(components, options);
