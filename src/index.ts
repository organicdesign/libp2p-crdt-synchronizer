import type { Libp2p } from "libp2p";
import { DistributedStateSynchronizer } from "distributed-state-synchronizer";

const PROTOCOL = "/libp2p-state-replication/0.0.1";

export class StateReplicator {
	private node: Libp2p;

	constructor(node: Libp2p) {
		node.handle(PROTOCOL, ({ connection, stream }) => {
			console.log("handling");
		});

		this.node = node;
	}

	async establishProtocols () {
		const connections = this.node.connectionManager.getConnections();

		for (const connection of connections) {
			if (connection.streams.find(s => s.stat.protocol === PROTOCOL)) {
				continue;
			}

			// This will throw if the node does not support this proto
			const stream = await connection.newStream(PROTOCOL);

			console.log("connected");
		}
	}

	async doSomething () {
		const streams = this.node.connectionManager.getConnections()
			.map(c => c.streams)
			.reduce((a, c) => [...a, ...c], [])
			.filter(s => s.stat.protocol === PROTOCOL);

		for (const stream of streams) {
			// Do something
		}
	}
}
