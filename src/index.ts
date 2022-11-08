import type { Libp2p } from "libp2p";
// import { DistributedStateSynchronizer } from "distributed-state-synchronizer";
import { StreamWrapper } from "./StreamWrapper.js";
import type { Connection, Stream } from "@libp2p/interface-connection";


const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;
	private streams = new Map<string, StreamWrapper>();

	constructor(node: Libp2p) {
		node.handle(PROTOCOL, async ({ connection, stream }) => {
			this.handleStream(connection, stream);
		});

		this.node = node;

		setTimeout(() => {
			setInterval(() => this.doSomething(), 5000);
		}, 35000);
	}

	async establishProtocols () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			if (connection.streams.find(s => s.stat.protocol === PROTOCOL)) {
				continue;
			}

			// This will throw if the node does not support this proto
			const stream = await connection.newStream(PROTOCOL);
			this.handleStream(connection, stream);
		}
	}

	async doSomething () {
		await this.establishProtocols();

		for (const stream of this.streams.values()) {
			// Do something
			stream.write(new Uint8Array([1, 2, 3]));
		}
	}

	private async handleStream (connection: Connection, stream: Stream) {
		const remotePeer = connection.remotePeer.toString();

		const wrapper = new StreamWrapper(stream);

		this.streams.set(remotePeer, wrapper);


		try {
			for await (const val of wrapper.reader) {
				console.log("GOT DATA:", val);
			}
		} catch (error) {
			console.warn(error);
		}

		wrapper.close();
		this.streams.delete(remotePeer);
	}
}
