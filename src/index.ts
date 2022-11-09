import {
	JSONRPCServerAndClient,
	JSONRPCClient,
	JSONRPCServer
} from "json-rpc-2.0";
import type { Libp2p } from "libp2p";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import * as lp from "it-length-prefixed";
import { pipe } from "it-pipe";
import { pair } from "it-pair";
import { pushable, Pushable } from "it-pushable";
import { fromString as uint8ArrayFromString } from "uint8arrays/from-string";
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import type { Connection, Stream } from "@libp2p/interface-connection";
import { EventEmitter } from "events";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;
	public dss = new DistributedStateSynchronizer();
	private writers = new Map<string, Pushable<Uint8Array>>();
	private emitter = new EventEmitter();
	private connections = new Set<string>();
	public rpc = new JSONRPCServerAndClient<string, string>(
		new JSONRPCServer(),
		new JSONRPCClient(async (request: object, peerId: string) => {
			console.log("got ", request);
			if (peerId == null) {
				throw new Error("peer Id must be specified");
			}

			//const writer = this.writers.get(peerId);

			this.emitter.emit(peerId, request);

			/*
			if (!writer) {
				console.warn("not connected");
				return;
			}

			writer.push(uint8ArrayFromString(JSON.stringify(request)));
			*/
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

		node.connectionManager.addEventListener("peer:connect", async (evt) => {
			const stream = await node.dialProtocol(evt.detail.remotePeer, PROTOCOL);

			this.handleStream(stream, evt.detail);
		});


		this.node = node;
	}

	async requestBlocks () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			// This will throw if the node does not support this proto
			//const stream = await connection.newStream(PROTOCOL);

			//this.handleStream(stream, connection);

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
		if (this.connections.has(connection.id)) {
			return;
		}

		this.connections.add(connection.id);

		// Handle outputs.
		(async () => {
			await pipe(async function* () {
				for (;;) {
					const message = await new Promise(resolve => that.emitter.once(peerId, resolve));

					if (stream.stat.timeline.close) {
						return;
					}

					yield uint8ArrayFromString(JSON.stringify(message));
				}
			}, lp.encode(), stream);

			this.connections.delete(connection.id);
		})();
	}
}
