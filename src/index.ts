import {
	JSONRPCServerAndClient,
	JSONRPCClient,
	JSONRPCServer
} from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import type { Connection, Stream } from "@libp2p/interface-connection";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;
	public dss = new DistributedStateSynchronizer();
	private writers = new Map<string, Pushable<Uint8Array>>();
	public rpc = new JSONRPCServerAndClient<string, string>(
		new JSONRPCServer(),
		new JSONRPCClient(async (request: object, peerId: string) => {
			console.log("got ", request);
			if (peerId == null) {
				throw new Error("peer Id must be specified");
			}

			const writer = this.writers.get(peerId);

			if (!writer) {
				console.warn("not connected");
				return;
			}

			writer.push(uint8ArrayFromString(JSON.stringify(request)));
		})
	);


	constructor(node: Libp2p) {
		node.handle(PROTOCOL, async ({ stream, connection }) => {
			this.handleStream(stream, connection);
		});

		this.rpc.addMethod("getBlocks", async (data: { filter: number[] }) => {
			const { blocks } = await this.dss.sync({ filter: new Uint8Array(data.filter), blocks: [] });

			return blocks;
		});

		this.node = node;
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// This will throw if the node does not support this proto
			const stream = await connection.newStream(PROTOCOL);

			this.handleStream(stream, connection);

			const { filter } = await this.dss.sync();
			const blocks = await this.rpc.request(
				"getBlocks",
				{ filter: Array.from(filter) },
				connection.remotePeer.toString()
			);

			await this.dss.sync({ blocks, filter: new Uint8Array() });
		}
	}

	handleStream (stream: Stream, connection: Connection) {
		const that = this;
		const peerId = connection.remotePeer.toString();

		// Handle inputs.
		pipe(stream, lp.decode(), async function (source) {
			for await (const message of source) {
				const data = JSON.parse(uint8ArrayToString(message.subarray()));
				await that.rpc.receiveAndSend(data, peerId, peerId);
			}
		});

		// Don't pipe events through the same connection
		if (this.writers.has(peerId)) {
			return;
		}

		const writer = pushable();

		this.writers.set(peerId, writer);

		// Handle outputs.
		(async () => {
			await pipe(writer, lp.encode(), stream);

			this.writers.delete(peerId);
		})();
	}
}
