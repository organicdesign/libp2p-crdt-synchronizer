import { JSONRPCServerAndClient, JSONRPCClient, JSONRPCServer } from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import type { Connection, Stream } from "@libp2p/interface-connection";
import { GSet } from "./GSet.js";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private readonly rootSet = new GSet<string>();
	private readonly node: Libp2p;
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


	constructor(node: Libp2p) {
		this.node = node;

		node.handle(PROTOCOL, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.rpc.addMethod("getCRDT", async (data: { key?: string }) => {
			if (!data.key) {
				return this.rootSet.serialize();
			}
		});
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// Only open a new stream if we don't already have on open.
			if (!this.writers.has(connection.remotePeer.toString())) {
				// This will throw if the node does not support this protocol
				const stream = await connection.newStream(PROTOCOL);

				this.handleStream(stream, connection);
			}

			const rootSet = await this.rpc.request(
				"getCRDT",
				{},
				connection.remotePeer.toString()
			);

			this.rootSet.merge(rootSet);
		}
	}

	addCRDT (name: string) {
		this.rootSet.add(name);
	}

	getCRDTValue (name?: string) {
		if (!name) {
			return this.rootSet.values();
		}
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
